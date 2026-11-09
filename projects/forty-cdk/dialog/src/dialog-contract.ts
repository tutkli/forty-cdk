/**
 * Key of the member a dialog component declares to state the data it reads and the result it
 * closes with. Declare it once on the component, with no initializer:
 *
 * ```ts
 * class ConfirmDialog {
 *   declare readonly [FOR_DIALOG_CONTRACT]: ForDialogContract<ConfirmData, ConfirmResult>;
 *   readonly data = injectDialogData<ConfirmDialog>();
 *   readonly ref = injectDialogRef<ConfirmDialog>();
 * }
 * ```
 *
 * `ForDialogManager.open(ConfirmDialog, { data })` then rejects a `data` that is not a
 * `ConfirmData` and returns a `ForDialogRef<ConfirmResult>`, and the component's `ref.close()`
 * accepts only a `ConfirmResult`. The member must be public. A component that declares none
 * keeps an unchecked `data` and an `unknown` result. A `[forDialogClose]` button's `[closeWith]`
 * is not checked against the contract: close through `injectDialogRef()` where the result type
 * matters.
 */
export const FOR_DIALOG_CONTRACT: unique symbol = Symbol('forty-cdk/dialog:contract');

/**
 * Type of the {@link FOR_DIALOG_CONTRACT} member: `D` is the `data` payload the component reads,
 * `R` the value it closes with. It has no runtime value.
 */
export interface ForDialogContract<D, R = unknown> {
  readonly data: D;
  readonly result: R;
}

/** The `data` type component `C` declares through {@link FOR_DIALOG_CONTRACT}, else `unknown`. */
export type ForDialogDataOf<C> = C extends {
  readonly [FOR_DIALOG_CONTRACT]?: ForDialogContract<infer D, unknown>;
}
  ? D
  : unknown;

/** The result type component `C` declares through {@link FOR_DIALOG_CONTRACT}, else `unknown`. */
export type ForDialogResultOf<C> = C extends {
  readonly [FOR_DIALOG_CONTRACT]?: ForDialogContract<unknown, infer R>;
}
  ? R
  : unknown;
