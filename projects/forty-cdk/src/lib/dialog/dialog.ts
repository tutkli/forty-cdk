import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { lockBodyScroll, unlockBodyScroll } from '../_internal/body-scroll-lock/body-scroll-lock';
import {
  injectDismissableLayer,
  suppressDismissableLayerDispatch,
} from '../_internal/dismissable-layer/dismissable-layer';
import { findFirstFocusable, injectFocusTrap } from '../_internal/focus-trap/focus-trap';
import { injectPortal } from '../_internal/portal/portal';
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
 * body scroll, and listens for Escape while mounted. `aria-labelledby`
 * and `aria-describedby` wire automatically via `[forDialogTitle]` /
 * `[forDialogDescription]`; pass `ariaLabel` instead if you don't render
 * a visible title.
 *
 * Mount/unmount is the consumer's responsibility — the directive does
 * not manage `[hidden]`. Wrap with `@if (open())` and let
 * `animate.enter` / `animate.leave` handle transitions:
 *
 * ```html
 * @if (dialogOpen()) {
 *   <div forDialog (close)="dialogOpen.set(false)" animate.leave="fade-out">
 *     <h2 forDialogTitle>Confirm</h2>
 *     <button forDialogClose>Cancel</button>
 *   </div>
 * }
 * ```
 *
 * For programmatic use (open arbitrary components imperatively), see
 * `ForDialogManager.open()`.
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
    'data-state': 'open',
    tabindex: '-1',
  },
  providers: [{ provide: FOR_DIALOG_CONTEXT, useExisting: ForDialog }],
})
export class ForDialog implements ForDialogContext {
  /**
   * When true (default), Escape, backdrop click, pointer-down outside, and
   * focus outside emit `(close)`. Disable for critical confirm flows that
   * must be answered explicitly via `[forDialogClose]`.
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
   * Where to send focus on mount. `'first'` (default) finds the first
   * focusable descendant; `'container'` focuses the dialog box itself
   * (useful when there's nothing focusable inside).
   */
  readonly initialFocus = input<'first' | 'container'>('first');

  /** Manual `aria-label`. Use this when no visible title element exists. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Emitted when the dialog wants to close. Consumers wire this to flip
   * the signal that gates the surrounding `@if`. Reasons: `'escape'`,
   * `'backdrop'`, `'pointerDownOutside'`, `'focusOutside'`,
   * `'closeButton'`, `'programmatic'`.
   */
  readonly close = output<ForDialogCloseReason>();

  /**
   * Fires when the user presses Escape while this dialog is the topmost
   * dismissable layer. Call `event.preventDefault()` to suppress the
   * subsequent `(close)` emission (e.g. to ask for confirmation first).
   */
  readonly escapeKeyDown = output<KeyboardEvent>();

  /**
   * Fires when a pointer goes down outside the dialog. `preventDefault()`
   * suppresses the auto `(close)`.
   */
  readonly pointerDownOutside = output<PointerEvent>();

  /**
   * Fires when focus moves outside the dialog (e.g. user tabs out of a
   * non-modal dialog). `preventDefault()` suppresses the auto `(close)`.
   */
  readonly focusOutside = output<FocusEvent>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and
   * `focusOutside`. `preventDefault()` suppresses the auto `(close)`.
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

  // Captured once on mount so cleanup can mirror the same mode regardless
  // of whether the consumer toggles `modal()` on a doomed instance.
  #activatedAsModal = false;

  constructor() {
    injectPortal();

    // Run setup *after* Angular has applied input bindings (reading
    // `this.modal()` in the constructor would always see the default).
    afterNextRender(() => {
      const isModal = this.modal();
      this.#activatedAsModal = isModal;

      // Push the dismissable layer onto the stack *before* moving focus
      // so that focusin events triggered by our own focus management
      // land on this layer, not on whatever lower layer was previously
      // topmost.
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
        const host = this.#focusTrap.container;
        if (this.initialFocus() === 'container') {
          host.focus();
        } else {
          (findFirstFocusable(host) ?? host).focus();
        }
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.#dismissable.deactivate();
      if (this.#activatedAsModal) {
        // Suppress the dismissable-layer dispatcher across focus-return so
        // the synthetic `focusin` triggered by `.focus()`-ing the previous
        // element does not cascade-dismiss whatever dialog is now topmost
        // (a stacked dialog opened above this one).
        suppressDismissableLayerDispatch(() => {
          this.#focusTrap.deactivate({ returnFocus: this.returnFocus() });
        });
        unlockBodyScroll();
      }
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
    this.close.emit(reason);
  }
}
