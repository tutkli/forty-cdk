/**
 * Key of the member a drawer component declares to state the data it reads and the result it
 * closes with. Declare it once on the component, with no initializer:
 *
 * ```ts
 * class ConfirmDrawer {
 *   declare readonly [FOR_DRAWER_CONTRACT]: ForDrawerContract<ConfirmData, ConfirmResult>;
 *   readonly data = injectDrawerData<ConfirmDrawer>();
 * }
 * ```
 *
 * `ForDrawerManager.open(ConfirmDrawer, { data })` then rejects a `data` that is not a
 * `ConfirmData` and returns a `ForDrawerRef<ConfirmResult>`. The member must be public. A
 * component that declares none keeps an unchecked `data` and an `unknown` result.
 */
export const FOR_DRAWER_CONTRACT: unique symbol = Symbol('forty-cdk/drawer:contract');

/**
 * Type of the {@link FOR_DRAWER_CONTRACT} member: `D` is the `data` payload the component reads,
 * `R` the value it closes with. It has no runtime value.
 */
export interface ForDrawerContract<D, R = unknown> {
  readonly data: D;
  readonly result: R;
}

/** The `data` type component `C` declares through {@link FOR_DRAWER_CONTRACT}, else `unknown`. */
export type ForDrawerDataOf<C> = C extends {
  readonly [FOR_DRAWER_CONTRACT]?: ForDrawerContract<infer D, unknown>;
}
  ? D
  : unknown;

/** The result type component `C` declares through {@link FOR_DRAWER_CONTRACT}, else `unknown`. */
export type ForDrawerResultOf<C> = C extends {
  readonly [FOR_DRAWER_CONTRACT]?: ForDrawerContract<unknown, infer R>;
}
  ? R
  : unknown;
