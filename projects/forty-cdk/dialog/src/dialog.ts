import { booleanAttribute, Directive, inject, input } from '@angular/core';

import { injectModalShell, ModalSurfaceBase } from 'forty-cdk/core-overlay';
import {
  FOR_DIALOG_CONTEXT,
  type ForDialogCloseReason,
  type ForDialogContext,
} from './dialog-context';
import { FOR_DIALOG_DEFAULTS } from './dialog-defaults';

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
 *   <div forDialog (dismiss)="dialogOpen.set(false)" animate.leave="fade-out">
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
 * This is a deliberate choice: rather than keeping the node mounted and
 * flipping `data-state="closed"` to drive an exit transition, exit styling
 * is the consumer's `animate.leave` (see the usage example above), not a
 * `data-state="closed"` selector — so a `[data-state="closed"]` rule would
 * never match and is not a bug.
 */
@Directive({
  selector: '[forDialog]',
  exportAs: 'forDialog',
  providers: [{ provide: FOR_DIALOG_CONTEXT, useExisting: ForDialog }],
})
export class ForDialog extends ModalSurfaceBase<ForDialogCloseReason> implements ForDialogContext {
  readonly #defaults = inject(FOR_DIALOG_DEFAULTS);

  /**
   * When true (default), Escape, backdrop click, pointer-down outside, and
   * focus outside emit `(dismiss)`. Disable for critical confirm flows that
   * must be answered explicitly via `[forDialogClose]`.
   */
  readonly dismissible = input(this.#defaults.dismissible ?? true, { transform: booleanAttribute });

  /**
   * When true (default), sets `aria-modal="true"`, locks body scroll, and
   * traps focus. Set to `false` for non-modal popups (rare for dialogs).
   */
  readonly modal = input(this.#defaults.modal ?? true, { transform: booleanAttribute });

  /** When true (default), focus returns to the previously focused element on close. */
  readonly returnFocus = input(this.#defaults.returnFocus ?? true, { transform: booleanAttribute });

  /**
   * Where to send focus on mount. `'first'` (default) finds the first
   * focusable descendant; `'container'` focuses the dialog box itself
   * (useful when there's nothing focusable inside).
   */
  readonly initialFocus = input<'first' | 'container'>(this.#defaults.initialFocus ?? 'first');

  protected readonly entryPoint = 'dialog';

  constructor() {
    // The shared modal-shell handles portal + dismissible layer (with the
    // triple-veto pattern this directive used to implement inline) + modal
    // vs non-modal branching (focus trap + scroll lock + inert siblings) +
    // return-focus on destroy + the WebKit-#136 sync return-target capture.
    // Anything dialog-specific (role binding, ariaLabel, label / description
    // registration) lives on the shared ModalSurfaceBase.
    super();
    injectModalShell(this.modalShellConfig());
  }
}
