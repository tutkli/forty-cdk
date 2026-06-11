import { booleanAttribute, computed, Directive, input, output, signal } from '@angular/core';

import { injectModalShell } from '../_internal/modal-shell/modal-shell';
import {
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  FOR_DIALOG_CONTEXT,
  type ForDialogCloseReason,
  type ForDialogContext,
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
 *
 * `data-state` is a static `"open"`: because mount is the consumer's
 * responsibility (the host only exists inside `@if (open())`), the element is
 * present iff the dialog is open, so the attribute can never be `"closed"`.
 * This intentionally diverges from Radix, which keeps the node mounted and
 * flips `data-state="closed"` to drive an exit transition. Here, exit styling
 * is the consumer's `animate.leave` (see the usage example above), not a
 * `data-state="closed"` selector — so a `[data-state="closed"]` rule would
 * never match and is not a bug.
 */
@Directive({
  selector: '[forDialog]',
  exportAs: 'forDialog',
  host: {
    '[attr.role]': 'alert() ? "alertdialog" : "dialog"',
    '[attr.aria-modal]': 'modal() ? "true" : null',
    '[attr.aria-label]': 'ariaLabel() || null',
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
   * dismissable layer. Call `preventDefault()` on the emitted veto to
   * suppress the subsequent `(close)` emission (e.g. to ask for
   * confirmation first). The original `KeyboardEvent` is available on
   * `.event` for inspection.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Fires when a pointer goes down outside the dialog. Call
   * `preventDefault()` on the emitted veto to suppress the auto `(close)`.
   * The native `PointerEvent` is available on `.event`.
   */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /**
   * Fires when focus moves outside the dialog (e.g. user tabs out of a
   * non-modal dialog). `preventDefault()` on the veto suppresses the auto
   * `(close)`. The native `FocusEvent` is available on `.event`.
   */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and
   * `focusOutside` and shares their veto state — `preventDefault()` on
   * either one suppresses the auto `(close)`.
   */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /**
   * Callback invoked just before the dialog moves focus into itself on
   * mount. Receives a `VetoableEvent`; call `event.preventDefault()` to
   * skip the imperative focus move — useful when opening a dialog from
   * an input you want to keep focused. The focus trap (modal mode) still
   * cycles Tab inside the dialog once focus enters it.
   *
   * Bound as a function reference (`[autoFocusOnOpen]="onOpen"`), not as
   * an event binding. Symmetric with `ForDialogManager`'s
   * `config.autoFocusOnOpen`. The callback shape (rather than an
   * `output()`) lets the directive invoke it during the destroy hook
   * without depending on Angular's `OutputEmitterRef` lifecycle.
   */
  readonly autoFocusOnOpen = input<((event: VetoableEvent) => void) | undefined>(undefined);

  /**
   * Callback invoked just before focus returns to the previously
   * focused element on unmount. Receives a `VetoableEvent`; call
   * `event.preventDefault()` to skip the return-focus — useful when
   * the consumer wants to send focus elsewhere imperatively (e.g. a
   * confirmation toast).
   *
   * Bound as a function reference (`[autoFocusOnClose]="onClose"`), not
   * as an event binding. Fires reliably on both close paths: the
   * `(close)` output flow AND a direct `open.set(false)` from the
   * consumer. Symmetric with `ForDialogManager`'s
   * `config.autoFocusOnClose`.
   */
  readonly autoFocusOnClose = input<((event: VetoableEvent) => void) | undefined>(undefined);

  readonly #labelIds = signal<readonly string[]>([]);
  readonly #describedByIds = signal<readonly string[]>([]);
  // Captures the `value` argument from the most recent `requestClose(reason, value)`
  // call. Read by `ForDialogManager` to bridge `[forDialogClose] [closeWith]`
  // into `ForDialogRef.close(value)`. Plain in declarative usage (no consumer
  // ever reads it), so the API surface is unchanged.
  readonly #lastCloseValue = signal<unknown>(undefined);

  readonly labelledBy = computed<string | null>(() => {
    const ids = this.#labelIds();
    return ids.length === 0 ? null : ids.join(' ');
  });
  readonly describedBy = computed<string | null>(() => {
    const ids = this.#describedByIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  constructor() {
    // The shared modal-shell handles portal + dismissable layer (with the
    // triple-veto pattern this directive used to implement inline) + modal
    // vs non-modal branching (focus trap + scroll lock + inert siblings) +
    // return-focus on destroy + the WebKit-#136 sync return-target capture.
    // Anything dialog-specific (label / description registration, role
    // binding, ariaLabel) stays here.
    injectModalShell({
      modal: this.modal,
      returnFocus: this.returnFocus,
      initialFocus: this.initialFocus,
      autoFocusOnOpen: () => this.autoFocusOnOpen(),
      autoFocusOnClose: () => this.autoFocusOnClose(),
      dismiss: {
        dismissible: this.dismissible,
        requestClose: (reason) => this.requestClose(reason),
        emitEscapeKeyDown: (veto) => this.escapeKeyDown.emit(veto),
        emitPointerDownOutside: (veto) => this.pointerDownOutside.emit(veto),
        emitFocusOutside: (veto) => this.focusOutside.emit(veto),
        emitInteractOutside: (veto) => this.interactOutside.emit(veto),
      },
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

  requestClose(reason: ForDialogCloseReason, value?: unknown): void {
    if (reason !== 'closeButton' && reason !== 'programmatic' && !this.dismissible()) {
      return;
    }
    this.#lastCloseValue.set(value);
    // The `autoFocusOnClose` callback fires from the destroy hook (after
    // the consumer's `(close)` listener flips the `@if`-gating signal),
    // so it stays consistent across both close paths: this output-driven
    // flow AND a direct `open.set(false)` that bypasses `requestClose`
    // entirely.
    this.close.emit(reason);
  }

  /**
   * The `value` argument from the most recent `requestClose(reason, value)`
   * call. Read by `ForDialogManager` to bridge `[forDialogClose] [closeWith]`
   * into `ForDialogRef.close(value)`. Declarative consumers never need this —
   * it is plumbing for the imperative bootstrap path.
   *
   * @internal
   */
  readonly lastCloseValue = this.#lastCloseValue.asReadonly();
}
