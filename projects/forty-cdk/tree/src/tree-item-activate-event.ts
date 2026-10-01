import type { VetoableNativeEvent } from 'forty-cdk/core';

/**
 * Emitted by `ForTree`'s `(itemActivate)` for a press on a node: a click on its
 * `[forTreeItemLabel]` or `[forTreeItemCheckbox]`, or `Enter` / `Space` on the
 * focused node. `event` is the `click` or `keydown` of that press, so its
 * modifier keys are readable; `preventDefault()` keeps the press from selecting.
 */
export interface ForTreeItemActivateEvent<T = string> extends VetoableNativeEvent<
  MouseEvent | KeyboardEvent
> {
  /** The activated node's value. */
  readonly value: T;
}
