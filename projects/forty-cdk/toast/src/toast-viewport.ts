import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  numberAttribute,
  type Signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { hostAriaLabel, resolveConfigClass } from 'forty-cdk/core';
import {
  DEFAULT_TOAST_REGION,
  type ForToastCloseReason,
  type ForToastInstance,
  type ForToastSwipeDirection,
} from './toast-context';
import { FOR_TOAST_DEFAULTS } from './toast-defaults';
import { ForToastManager, type ForToastViewportRegistration } from './toast-manager';
import { ForToast } from './toast';
import { ForToastAction } from './toast-action';
import { ForToastClose } from './toast-close';
import { ForToastDescription } from './toast-description';
import { ForToastOutlet } from './toast-outlet';
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
 * `$implicit: instance` and `data: instance.config.data`, and is rendered
 * with the `[forToast]` injection context in scope (via `ForToastOutlet`),
 * so `[forToastTitle]` / `[forToastDescription]` / `[forToastAction]` /
 * `[forToastClose]` keep their automatic a11y / close wiring inside it.
 *
 * Per-toast classes: a config's `class` / `classList` is applied to the
 * rendered toast root, merged with the directive's own host attributes.
 *
 * Enter / exit animations: a toast renders inside this viewport's `@for`, so a
 * `[animate.leave]` on the row defers the unmount natively — the toast stays
 * mounted until its exit animation settles. Supply the class per-toast with
 * `show({ animateLeave })` or set a viewport-wide default with `[animateLeave]`
 * (per-toast wins); `[animateEnter]` mirrors it for class-applied entrances.
 *
 * Hotkey: pressing the configured `hotkey` (default `F6`) anywhere in the
 * document focuses the first toast. Override per-viewport with `[hotkey]`
 * or globally with `provideForToastDefaults({ hotkey: '…' })`. The listener
 * is owned once by `ForToastManager`, so the hotkey never double-fires when
 * several viewports are mounted.
 *
 * Regions: a viewport renders only toasts whose `region` matches its
 * `[region]` input (default {@link DEFAULT_TOAST_REGION}), so independent
 * viewports — e.g. top-right system notifications and bottom-center action
 * confirmations — are a first-class feature. If two viewports share a region,
 * only the first one mounted renders it (the rest stay dormant and warn in dev
 * mode), so a single `show()` always produces exactly one toast node.
 *
 * Accessibility: the host carries `role="region"` and an `aria-label`
 * (default `Notifications`). Toast nodes themselves carry their own
 * `role` (`status` / `alert`) and `aria-live`, so screen readers
 * announce updates without forcing focus.
 *
 * Over a modal: by default the host carries `data-for-modal-exempt`, so an open
 * modal `ForDialog` / `ForDrawer` (a) leaves the viewport out of its inert pass
 * instead of disabling it (when the viewport sits at the document-body level)
 * and (b) treats a click on a toast as "inside", never as `pointerDownOutside`.
 * A confirmation / error toast shown from a flow inside a modal therefore stays
 * interactive and clicking it does not dismiss the modal — no consumer-side
 * `data-for-modal-peer` stamping or `onPointerDownOutside` veto needed. Opt a
 * viewport out with `provideForToastDefaults({ overModal: 'inert' })`: the
 * marker is dropped, so the modal inerts the viewport and a click on a toast
 * dismisses it like any other background sibling.
 */
@Component({
  selector: 'for-toast-viewport, [forToastViewport]',
  exportAs: 'forToastViewport',
  imports: [
    NgTemplateOutlet,
    ForToast,
    ForToastOutlet,
    ForToastTitle,
    ForToastDescription,
    ForToastAction,
    ForToastClose,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'region',
    '[attr.data-for-modal-exempt]': "overModal === 'peer' ? '' : null",
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.data-region]': 'region()',
    tabindex: '-1',
    '[attr.data-toast-count]': 'visible().length',
  },
  template: `
    @for (toast of visible(); track toast.id; let i = $index) {
      <div
        forToast
        [class]="toastClass(toast)"
        [animate.enter]="toastAnimateEnter(toast)"
        [animate.leave]="toastAnimateLeave(toast)"
        [variant]="toast.config.variant ?? 'info'"
        [duration]="toast.config.duration ?? defaultDuration()"
        [restartToken]="toast.generation"
        [closable]="toast.config.closable !== false"
        [swipeDirection]="toast.config.swipeDirection ?? swipeDirection()"
        [swipeThreshold]="toast.config.swipeThreshold ?? swipeThreshold()"
        [attr.data-front-stack-index]="i"
        (dismiss)="onClose(toast, $event)"
      >
        @if (toast.config.template; as template) {
          <ng-container
            forToastOutlet
            #outlet="forToastOutlet"
            [ngTemplateOutlet]="template"
            [ngTemplateOutletContext]="{ $implicit: toast, data: toast.config.data }"
            [ngTemplateOutletInjector]="outlet.injector"
          />
        } @else {
          @if (toast.config.title) {
            <div forToastTitle>{{ toast.config.title }}</div>
          }
          @if (toast.config.description) {
            <div forToastDescription>{{ toast.config.description }}</div>
          }
          @if (toast.config.action; as action) {
            <button forToastAction (click)="action.activate()">
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

  /**
   * How this viewport behaves over an open modal `ForDialog` / `ForDrawer`,
   * resolved per-scope from `provideForToastDefaults({ overModal })` (default
   * `'peer'`). `'peer'` host-binds `data-for-modal-exempt` so the viewport
   * stays interactive over the modal; `'inert'` drops the marker so the modal
   * inerts the viewport and a click on a toast dismisses it.
   */
  protected readonly overModal = inject(FOR_TOAST_DEFAULTS).overModal;

  /** Accessible name for the viewport region. Default `'Notifications'`. */
  readonly label = input<string>('Notifications');

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.label() || null);

  /**
   * The toast region this viewport renders. Only toasts whose `region` matches
   * appear here; toasts opened without a `region` use
   * {@link DEFAULT_TOAST_REGION}, so the common single-viewport setup needs no
   * `[region]` at all. Mount viewports with distinct `[region]` values to drive
   * independent toast regions from one global `ForToastManager`.
   */
  readonly region = input<string>(DEFAULT_TOAST_REGION);

  /** Hotkey to focus the viewport. Default reads from `provideForToastDefaults`, falling back to `F6`. */
  readonly hotkey = input<string>('');

  /**
   * Maximum number of toasts rendered at once. Older toasts collapse out of
   * the visible stack but stay in `manager.toasts()` until dismissed. When
   * unset (`null`, the default), the viewport falls back to the global
   * `provideForToastDefaults({ maxVisible })` value (itself `Infinity` unless
   * configured, which renders all live toasts). Setting `[maxVisible]`
   * per-viewport overrides the global default.
   *
   * **Overflow is parked, not auto-expired.** A toast pushed out of the
   * visible window is unmounted, so its auto-dismiss timer is not running
   * while it waits. It re-enters the window when a newer toast is dismissed,
   * and its `duration` countdown then restarts from full (a fresh `[forToast]`
   * mounts). Cap with `maxVisible` for layout, but dismiss explicitly — via
   * `ForToastRef.dismiss()`, `dismissAll()`, or the action / close button —
   * if you need overflow toasts to clear on a deadline.
   */
  readonly maxVisible = input<number | null>(null, {
    transform: (v: unknown): number | null => (v == null ? null : numberAttribute(v)),
  });

  /**
   * Default swipe direction(s) applied to every programmatic toast that
   * doesn't override `swipeDirection` in its own config. `null` (default)
   * keeps swipe disabled unless explicitly opted into per-toast.
   */
  readonly swipeDirection = input<ForToastSwipeDirection>(null);

  /**
   * Default dismiss-distance in pixels applied to every programmatic toast
   * that doesn't override `swipeThreshold` in its own config.
   */
  readonly swipeThreshold = input(50, { transform: numberAttribute });

  /**
   * Default `animate.enter` class applied to every programmatic toast that
   * doesn't set `animateEnter` in its own config. Empty (default) plays no
   * class-applied enter animation — a plain CSS `@keyframes` on `[forToast]`
   * already runs on mount without it.
   */
  readonly animateEnter = input<string>('');

  /**
   * Default `animate.leave` class applied to every programmatic toast that
   * doesn't set `animateLeave` in its own config. Empty (default) unmounts the
   * toast synchronously on dismiss; set it (or per-toast `animateLeave`) to
   * keep the toast mounted until its exit animation settles before it leaves
   * the DOM.
   */
  readonly animateLeave = input<string>('');

  protected readonly defaultDuration = computed(() => this.#manager.defaultDuration());

  /**
   * Resolved `maxVisible` limit: the per-viewport `[maxVisible]` when set,
   * otherwise the global `provideForToastDefaults({ maxVisible })` value.
   */
  protected readonly resolvedMaxVisible = computed(() => {
    const own = this.maxVisible();
    return own ?? this.#manager.defaultMaxVisible();
  });

  /**
   * Whether this viewport is the active renderer for its region. The manager
   * grants this to the first viewport mounted per region; dormant viewports
   * render nothing so a single `show()` yields exactly one toast node.
   */
  readonly #active: Signal<boolean>;

  protected readonly visible = computed<readonly ForToastInstance[]>(() => {
    if (!this.#active()) {
      return [];
    }
    const region = this.region();
    const all = this.#manager.toasts().filter((toast) => toast.config.region === region);
    const resolved = this.resolvedMaxVisible();
    const limit = Number.isFinite(resolved) ? resolved : all.length;
    if (all.length <= limit) {
      return all;
    }
    // Newest toasts win; older ones drop out of the visible window.
    return all.slice(all.length - limit);
  });

  constructor() {
    const registration: ForToastViewportRegistration = {
      region: this.region,
      hotkey: () => this.hotkey() || this.#manager.hotkey(),
      focusFirst: () => this.#focusFirst(),
    };
    this.#active = computed(() => this.#manager.isActiveViewport(registration));
    const unregister = this.#manager.registerViewport(registration);
    inject(DestroyRef).onDestroy(unregister);

    if (isDevMode()) {
      // Warn once each time this viewport becomes dormant because another
      // viewport already owns its region — the silent-duplication footgun the
      // region API exists to remove.
      let warned = false;
      effect(() => {
        if (this.#active()) {
          warned = false;
        } else if (!warned) {
          warned = true;
          console.warn(
            `[forty-cdk/toast] A <for-toast-viewport> for region "${this.region()}" is already mounted; ` +
              `this one stays inactive to avoid duplicate toasts. Give it a distinct [region] for an independent toast region.`,
          );
        }
      });
    }
  }

  /** Focus the first rendered toast host. Returns `true` when focus moved. */
  #focusFirst(): boolean {
    const first = this.#host.nativeElement.querySelector<HTMLElement>('[forToast]');
    if (first) {
      first.focus();
      return true;
    }
    return false;
  }

  protected onClose(toast: ForToastInstance, reason: ForToastCloseReason): void {
    toast.dismiss(reason);
  }

  /**
   * Consumer class(es) for a toast row, resolved from its config's `class` /
   * `classList`. Returns `''` when neither is set so the `[class]` host
   * binding emits no extra tokens and leaves the directive's own host
   * attributes untouched.
   */
  protected toastClass(toast: ForToastInstance): string {
    return resolveConfigClass(toast.config) ?? '';
  }

  /**
   * `animate.enter` class for a toast row: its per-toast `animateEnter` config
   * when set, otherwise the viewport-level `[animateEnter]`. Empty when neither
   * is set.
   */
  protected toastAnimateEnter(toast: ForToastInstance): string {
    return toast.config.animateEnter ?? this.animateEnter();
  }

  /**
   * `animate.leave` class for a toast row: its per-toast `animateLeave` config
   * when set, otherwise the viewport-level `[animateLeave]`. Empty when neither
   * is set, which keeps the toast's unmount synchronous on dismiss.
   */
  protected toastAnimateLeave(toast: ForToastInstance): string {
    return toast.config.animateLeave ?? this.animateLeave();
  }
}
