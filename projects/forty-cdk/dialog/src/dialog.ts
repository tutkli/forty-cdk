import {
  booleanAttribute,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
  type Signal,
} from '@angular/core';

import { createSingleSlot, FOR_FIELD_ANCHOR_CONTEXT, FOR_FIELD_CONTEXT } from 'forty-cdk/core';
import { injectModalShell, ModalSurfaceBase, warnIfDialogUnnamed } from 'forty-cdk/core-overlay';
import {
  FOR_DIALOG_CONTEXT,
  type ForDialogCloseReason,
  type ForDialogContext,
} from './dialog-context';
import { FOR_DIALOG_DEFAULTS } from './dialog-defaults';
import { DialogDepthRegistry } from './dialog-depth';

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
 *
 * `data-depth` and `--for-dialog-depth` carry the dialog's stacking position among the mounted
 * dialogs (`0` for the first), so a consumer can write one z-index rule for every level.
 *
 * A field boundary: a control inside it never registers with an ancestor
 * `[forField]`, and a `[forField]` inside it still wires its own control.
 */
@Directive({
  selector: '[forDialog]',
  exportAs: 'forDialog',
  host: {
    '[attr.data-depth]': 'depth()',
    '[style.--for-dialog-depth]': 'depth()',
  },
  providers: [
    { provide: FOR_DIALOG_CONTEXT, useExisting: ForDialog },
    { provide: FOR_FIELD_CONTEXT, useValue: null },
    { provide: FOR_FIELD_ANCHOR_CONTEXT, useValue: null },
  ],
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

  readonly #depthHandle = inject(DialogDepthRegistry).claim(
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
  );

  /**
   * Stacking position among the dialogs mounted when this one mounted: `0` for the first, one above
   * the deepest one still mounted otherwise. Fixed for the dialog's lifetime.
   */
  readonly depth: Signal<number> = signal(this.#depthHandle.depth).asReadonly();

  readonly #initialFocusSlot = createSingleSlot<HTMLElement>({
    primitive: 'dialog',
    owner: '[forDialog]',
    claimant: '[forDialogInitialFocus]',
  });

  protected readonly initialFocusTarget = this.#initialFocusSlot.value;

  constructor() {
    // The shared modal-shell handles portal + dismissible layer (with the
    // triple-veto pattern this directive used to implement inline) + modal
    // vs non-modal branching (focus trap + scroll lock + inert siblings) +
    // return-focus on destroy + the WebKit-#136 sync return-target capture.
    // Anything dialog-specific (role binding, ariaLabel, label / description
    // registration) lives on the shared ModalSurfaceBase.
    super();
    injectModalShell(this.modalShellConfig());
    warnIfDialogUnnamed({
      primitive: 'dialog',
      piece: '[forDialog]',
      title: '[forDialogTitle]',
      ariaLabelOn: '[forDialog] (or pass `ariaLabel` to `ForDialogManager.open()`)',
    });
    inject(DestroyRef).onDestroy(() => this.#depthHandle.release());
  }

  private registerInitialFocus(el: HTMLElement): void {
    this.#initialFocusSlot.register(el);
  }

  private unregisterInitialFocus(el: HTMLElement): void {
    this.#initialFocusSlot.unregister(el);
  }
}
