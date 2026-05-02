import { inject, InjectionToken, Signal } from '@angular/core';

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

  registerLabel(id: string): void;
  unregisterLabel(id: string): void;
  registerDescription(id: string): void;
  unregisterDescription(id: string): void;

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

export const FOR_DIALOG_CONTEXT = new InjectionToken<ForDialogContext>(
  'FOR_DIALOG_CONTEXT',
);

export function injectDialogContext(piece: string): ForDialogContext {
  const ctx = inject(FOR_DIALOG_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/dialog] ${piece} must be used inside a [forDialog] element.`,
    );
  }
  return ctx;
}
