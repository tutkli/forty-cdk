import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import type { ForToastInstance } from './toast-context';
import { ForToastManager } from './toast-manager';
import { ForToast } from './toast';
import { ForToastAction } from './toast-action';
import { ForToastClose } from './toast-close';
import { ForToastDescription } from './toast-description';
import { ForToastTitle } from './toast-title';

/**
 * Mounted once near the root of the app — typically inside `app.html`.
 * Listens to `ForToastManager.toasts()` and renders each programmatic
 * toast inline. Position the viewport from CSS (`position: fixed`,
 * `top|bottom`, `left|right`) — the directive doesn't impose any.
 *
 * Custom rendering: if a toast's config has `template`, that
 * `TemplateRef<ForToastTemplateContext>` is used instead of the default
 * title / description / action / close shape. The template receives
 * `$implicit: instance` and `data: instance.config.data`.
 *
 * Hotkey: pressing the configured `hotkey` (default `F6`) anywhere in the
 * document focuses the first toast. Override per-viewport with `[hotkey]`
 * or globally with `provideForToastDefaults({ hotkey: '…' })`.
 *
 * Accessibility: the host carries `role="region"` and an `aria-label`
 * (default `Notifications`). Toast nodes themselves carry their own
 * `role` (`status` / `alert`) and `aria-live`, so screen readers
 * announce updates without forcing focus.
 */
@Component({
  selector: 'for-toast-viewport, [forToastViewport]',
  exportAs: 'forToastViewport',
  imports: [
    NgTemplateOutlet,
    ForToast,
    ForToastTitle,
    ForToastDescription,
    ForToastAction,
    ForToastClose,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'region',
    '[attr.aria-label]': 'label()',
    tabindex: '-1',
    '[attr.data-toast-count]': 'visible().length',
  },
  template: `
    @for (toast of visible(); track toast.id; let i = $index) {
      <div
        forToast
        [variant]="toast.config.variant ?? 'info'"
        [duration]="toast.config.duration ?? defaultDuration()"
        [closable]="toast.config.closable !== false"
        [attr.data-front-stack-index]="i"
        (close)="onClose(toast, $event)"
      >
        @if (toast.config.template) {
          <ng-container
            *ngTemplateOutlet="
              toast.config.template;
              context: { $implicit: toast, data: toast.config.data }
            "
          />
        } @else {
          @if (toast.config.title) {
            <div forToastTitle>{{ toast.config.title }}</div>
          }
          @if (toast.config.description) {
            <div forToastDescription>{{ toast.config.description }}</div>
          }
          @if (toast.config.action; as action) {
            <button forToastAction (click)="action.onClick()">
              {{ action.label }}
            </button>
          }
          @if (toast.config.closable !== false) {
            <button forToastClose>×</button>
          }
        }
      </div>
    }
  `,
})
export class ForToastViewport {
  readonly #manager = inject(ForToastManager);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Accessible name for the viewport region. Default `'Notifications'`. */
  readonly label = input<string>('Notifications');

  /** Hotkey to focus the viewport. Default reads from `provideForToastDefaults`, falling back to `F6`. */
  readonly hotkey = input<string>('');

  /**
   * Maximum number of toasts rendered at once. Older toasts collapse out of
   * the visible stack but stay in `manager.toasts()` until dismissed.
   * `Infinity` (default) renders all live toasts.
   */
  readonly maxVisible = input(Infinity, { transform: numberAttribute });

  protected readonly defaultDuration = computed(() => this.#manager.defaultDuration());

  protected readonly visible = computed(() => {
    const all = this.#manager.toasts();
    const limit = Number.isFinite(this.maxVisible()) ? this.maxVisible() : all.length;
    if (all.length <= limit) {
      return all;
    }
    // Newest toasts win; older ones drop out of the visible window.
    return all.slice(all.length - limit);
  });

  constructor() {
    const onKeyDown = (event: KeyboardEvent): void => {
      const key = this.hotkey() || this.#manager.hotkey();
      if (event.key !== key) {
        return;
      }
      const items = this.visible();
      if (items.length === 0) {
        return;
      }
      // Focus the first rendered toast — the host element of the directive.
      const first = this.#host.nativeElement.querySelector<HTMLElement>('[forToast]');
      if (first) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', onKeyDown);
    });
  }

  protected onClose(toast: ForToastInstance, _reason: unknown): void {
    toast.dismiss();
  }
}
