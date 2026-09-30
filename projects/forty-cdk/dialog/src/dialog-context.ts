import { inject, InjectionToken, type Signal } from '@angular/core';

import { assertRootContext, orphanContextError } from 'forty-cdk/core';

export type ForDialogCloseReason =
  | 'escape'
  | 'backdrop'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'closeButton'
  | 'programmatic';

/**
 * Coordination contract owned by `ForDialog` (declarative) or by the
 * programmatic `ForDialogManager.open()` machinery. Title / Description register
 * their generated ids so the dialog wires `aria-labelledby` /
 * `aria-describedby` reactively. Close button and backdrop request close
 * via `requestClose` — the implementation decides whether to honor the
 * request based on `dismissible` and on programmatic semantics.
 *
 * The dialog's "openness" isn't part of this contract: the directive is
 * mounted iff the dialog is open, so descendants don't need an open
 * signal to coordinate.
 */
export interface ForDialogContext {
  readonly dismissible: Signal<boolean>;
  readonly modal: Signal<boolean>;
  readonly alert: Signal<boolean>;
  readonly labelledBy: Signal<string | null>;
  readonly describedBy: Signal<string | null>;
  /**
   * Portal target shared with the backdrop so both resolve the same
   * container. `null` ⇒ `document.body`. Set via the dialog's `container`
   * input; read once per mount.
   */
  readonly container: Signal<HTMLElement | null>;
  /**
   * Stacking position among the dialogs mounted when this one mounted: `0` for the first, one above
   * the deepest one still mounted otherwise. Fixed for the dialog's lifetime. Reflected as
   * `data-depth` and `--for-dialog-depth` on the surface and its backdrop.
   */
  readonly depth: Signal<number>;

  registerLabel(id: string): void;
  unregisterLabel(id: string): void;
  registerDescription(id: string): void;
  unregisterDescription(id: string): void;

  /**
   * Register the backdrop element so the dismissible layer treats it as
   * part of the dialog surface (`exemptElements`) — without this, a
   * `pointerdown` on the portaled backdrop (a body sibling of the dialog
   * host, outside `host.contains()`) fires `pointerDownOutside` and closes
   * with reason `'pointerDownOutside'`, then the backdrop's own `click`
   * emits a second `(dismiss)` with reason `'backdrop'` — a double dismiss
   * with the wrong first reason, and a veto on either channel fails to stop
   * the other. Exempting the backdrop routes the interaction solely through
   * the backdrop's `click` → `requestClose('backdrop')`. Pass `null` to
   * unregister.
   */
  registerBackdrop(el: HTMLElement | null): void;

  /**
   * Request that the dialog close. Reasons:
   * - `'escape'` / `'backdrop'` / `'pointerDownOutside'` / `'focusOutside'`:
   *   honored only when `dismissible()` is true.
   * - `'closeButton'`: always honored.
   * - `'programmatic'`: always honored, used by `ForDialogManager.open()` consumers
   *   that drive close imperatively from a child component.
   *
   * `value` is the close result, propagated to `ForDialogRef.close(value)`
   * in programmatic mode. Ignored in declarative mode.
   */
  requestClose(reason: ForDialogCloseReason, value?: unknown): void;
}

/**
 * The registration protocol `[forDialogInitialFocus]` drives. Never exported from
 * `public-api.ts`; `ForDialog` declares both members TS-`private`.
 */
export interface DialogRegistrationContext {
  /** Registers the element the dialog focuses on mount. */
  registerInitialFocus(el: HTMLElement): void;
  /** Removes a previously registered initial-focus element. */
  unregisterInitialFocus(el: HTMLElement): void;
}

/**
 * The dialog's internal coordination surface: everything {@link ForDialogContext} publishes plus
 * the {@link DialogRegistrationContext} protocol. It is the type the pieces read
 * {@link FOR_DIALOG_CONTEXT} at.
 */
export interface DialogContext extends ForDialogContext, DialogRegistrationContext {}

/**
 * DI token for the dialog's coordination surface, provided by `[forDialog]`.
 *
 * Publicly typed as the read surface {@link ForDialogContext}. The pieces read the same token at an
 * internal type that adds the initial-focus registration, so a wrapper re-providing it must alias it
 * to the root: `{ provide: FOR_DIALOG_CONTEXT, useExisting: MyDialog }`, where `MyDialog` extends
 * `ForDialog`. A value that merely satisfies the declared type resolves too, and is rejected in dev
 * mode by the first piece to resolve it.
 */
export const FOR_DIALOG_CONTEXT = new InjectionToken<ForDialogContext>('FOR_DIALOG_CONTEXT');

/**
 * @internal Per-instance dialog id, provided by `ForDialogManager` into the
 * opened component's injector so the portaled `[forDialogBackdrop]` can
 * reflect `data-for-dialog-id` and be paired with its dialog for the
 * manager's exit-animation orchestration. Absent in the declarative path,
 * where the backdrop's own `animate.leave` runs normally.
 */
export const FOR_DIALOG_INSTANCE_ID = new InjectionToken<string>('FOR_DIALOG_INSTANCE_ID');

export function injectDialogContext(piece: string): DialogContext {
  const ctx = inject(FOR_DIALOG_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-DIALOG-001',
      piece,
      root: '[forDialog]',
      token: 'FOR_DIALOG_CONTEXT',
    });
  }
  const widened = ctx as unknown as DialogContext;
  assertRootContext({
    entryPoint: 'dialog',
    token: 'FOR_DIALOG_CONTEXT',
    root: '[forDialog]',
    piece,
    probe: () => widened.registerInitialFocus,
  });
  return widened;
}
