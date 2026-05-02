import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import { lockBodyScroll, unlockBodyScroll } from '../_internal/body-scroll-lock';
import { injectDismissableLayer } from '../_internal/dismissable-layer';
import { injectFocusTrap } from '../_internal/focus-trap';
import { injectPortal } from '../_internal/portal';
import { injectPresence } from '../_internal/presence';
import {
  FOR_DIALOG_CONTEXT,
  ForDialogCloseReason,
  ForDialogContext,
} from './dialog-context';

/**
 * Headless implementation of the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
 *
 * Apply `[forDialog]` on the dialog box itself — not on a wrapper. The
 * directive moves the host to `document.body` (portal), traps focus, locks
 * body scroll, and listens for Escape while open. `aria-labelledby` and
 * `aria-describedby` are wired automatically via `[forDialogTitle]` /
 * `[forDialogDescription]` registration; pass `ariaLabel` instead if you
 * don't render visible title text.
 *
 * For programmatic use (open arbitrary components imperatively), see
 * `ForDialogs.open()` — same behaviors under the hood.
 */
@Directive({
  selector: '[forDialog]',
  exportAs: 'forDialog',
  host: {
    '[attr.role]': 'alert() ? "alertdialog" : "dialog"',
    '[attr.aria-modal]': 'modal() ? "true" : null',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.hidden]': 'present() ? null : ""',
    tabindex: '-1',
  },
  providers: [{ provide: FOR_DIALOG_CONTEXT, useExisting: ForDialog }],
})
export class ForDialog implements ForDialogContext {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Two-way bindable visibility. The `model()` change emitter (`(openChange)`)
   * fires only on internal transitions (Escape, backdrop click,
   * pointer-down / focus outside, `[forDialogClose]` button, programmatic
   * `requestClose`), never on consumer writes via `[(open)]` — observe
   * state changes without binding back.
   */
  readonly open = model<boolean>(false);

  /**
   * When true (default), Escape and backdrop click close the dialog.
   * Disable for critical confirm flows that must be answered explicitly.
   */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /**
   * When true (default), sets `aria-modal="true"`, locks body scroll, and
   * traps focus. Set to `false` for non-modal popups (rare for dialogs).
   */
  readonly modal = input(true, { transform: booleanAttribute });

  /** When true, role becomes `alertdialog` (interrupts assistive tech). */
  readonly alert = input(false, { transform: booleanAttribute });

  /** When true (default), focus returns to the previously focused element on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /**
   * Where to send focus on open. `'first'` (default) finds the first
   * focusable descendant; `'container'` focuses the dialog box itself
   * (useful when there's nothing focusable inside).
   */
  readonly initialFocus = input<'first' | 'container'>('first');

  /** Manual `aria-label`. Use this when no visible title element exists. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * When true, the dialog stays mounted in the DOM regardless of `open`
   * state — `[hidden]` is never applied. Useful when the consumer drives
   * mount/unmount externally (e.g. via `@if`) or wants to keep the DOM
   * stable for animation orchestration. `data-state` still reflects the
   * logical open/closed state.
   */
  readonly forceMount = input(false, { transform: booleanAttribute });

  /**
   * Fires when the user presses Escape while this dialog is the topmost
   * dismissable layer. Call `event.preventDefault()` to keep the dialog
   * open (e.g. to ask for confirmation first). Otherwise the dialog
   * closes — provided `dismissible` is true.
   */
  readonly escapeKeyDown = output<KeyboardEvent>();

  /**
   * Fires when a pointer goes down outside the dialog. `preventDefault()`
   * cancels the auto-close. Useful to keep the dialog open when the user
   * clicks specific decorative regions you'd rather treat as inert.
   */
  readonly pointerDownOutside = output<PointerEvent>();

  /**
   * Fires when focus moves outside the dialog (e.g. user tabs out of a
   * non-modal dialog). `preventDefault()` cancels the auto-close.
   */
  readonly focusOutside = output<FocusEvent>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and
   * `focusOutside`. `preventDefault()` cancels the auto-close like the
   * specific events.
   */
  readonly interactOutside = output<PointerEvent | FocusEvent>();

  readonly #labelIds = signal<readonly string[]>([]);
  readonly #describedByIds = signal<readonly string[]>([]);

  readonly labelledBy = computed<string | null>(() => {
    const ids = this.#labelIds();
    return ids.length === 0 ? null : ids.join(' ');
  });
  readonly describedBy = computed<string | null>(() => {
    const ids = this.#describedByIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  readonly #focusTrap = injectFocusTrap();
  readonly #dismissable = injectDismissableLayer();
  readonly #presence = injectPresence({ open: this.open, forceMount: this.forceMount });

  /**
   * `true` while the dialog should remain in the DOM. Tracks `open()` plus
   * any closing animation still playing on the host, plus `forceMount`.
   * Bound to `[attr.hidden]` so closing animations driven from
   * `data-state="closed"` complete before unmount.
   */
  protected readonly present = this.#presence.present;

  constructor() {
    injectPortal();

    effect((onCleanup) => {
      const isOpen = this.open();
      if (!isOpen) {
        return;
      }
      const isModal = this.modal();

      // Push the dismissable layer onto the stack *before* moving focus so
      // that focusin events triggered by our own focus management land on
      // this layer, not on whatever lower layer was previously topmost.
      this.#dismissable.activate({
        onEscapeKeyDown: (event) => {
          this.escapeKeyDown.emit(event);
          if (!event.defaultPrevented && this.dismissible()) {
            event.stopPropagation();
            this.requestClose('escape');
          }
        },
        onPointerDownOutside: (event) => {
          this.pointerDownOutside.emit(event);
        },
        onFocusOutside: (event) => {
          this.focusOutside.emit(event);
        },
        onInteractOutside: (event) => {
          this.interactOutside.emit(event);
          if (!event.defaultPrevented && this.dismissible()) {
            this.requestClose(
              event.type === 'pointerdown' ? 'pointerDownOutside' : 'focusOutside',
            );
          }
        },
      });

      if (isModal) {
        this.#focusTrap.activate({ initialFocus: this.initialFocus() });
        lockBodyScroll();
      } else {
        // Non-modal: still send focus, no trap.
        if (this.initialFocus() === 'container') {
          this.#host.nativeElement.focus();
        } else {
          const first = this.#host.nativeElement.querySelector<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          );
          (first ?? this.#host.nativeElement).focus();
        }
      }

      onCleanup(() => {
        this.#dismissable.deactivate();
        if (isModal) {
          this.#focusTrap.deactivate({ returnFocus: this.returnFocus() });
          unlockBodyScroll();
        }
      });
    });
  }

  registerLabel(id: string): void {
    this.#labelIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterLabel(id: string): void {
    this.#labelIds.update((arr) => arr.filter((x) => x !== id));
  }
  registerDescription(id: string): void {
    this.#describedByIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterDescription(id: string): void {
    this.#describedByIds.update((arr) => arr.filter((x) => x !== id));
  }

  requestClose(reason: ForDialogCloseReason, _value?: unknown): void {
    if (reason !== 'closeButton' && reason !== 'programmatic' && !this.dismissible()) {
      return;
    }
    this.open.set(false);
  }
}
