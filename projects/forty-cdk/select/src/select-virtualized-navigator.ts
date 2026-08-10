import { isUnset, VirtualizedNavigator, type VirtualizedNavigatorDeps } from 'forty-cdk/core';
import type { ForSelectOptionHandle } from './select-context';

/**
 * Position-snapshot entry for `ForSelect`. Carries the option's raw `value` on
 * top of the engine's `id` / `disabled`, so the root can resolve the committed
 * option's absolute index on open even while it is outside the rendered window.
 */
export interface SelectPositionEntry<T> {
  /** Stable option host id — the activedescendant target. */
  readonly id: string;
  /** The option's raw value, matched against the selection by `compareWith`. */
  readonly value: T;
  /** Whether the option is disabled, so navigation skips over it. */
  readonly disabled: boolean;
}

/** The shared navigation engine as `ForSelect` parameterises it. */
export type SelectVirtualizedNavigator<T> = VirtualizedNavigator<
  ForSelectOptionHandle<T>,
  SelectPositionEntry<T>
>;

/**
 * Wire the shared `forty-cdk/core` navigation engine to the select option
 * handle: the handle carries its absolute `posInSet` and its raw `value`, and an
 * option whose `[value]` binding is not written yet is skipped this fold and
 * folded in on the binding's re-run.
 *
 * Internal — not re-exported from `select/index.ts` or `public-api.ts`.
 */
export function createSelectVirtualizedNavigator<T>(
  deps: VirtualizedNavigatorDeps<ForSelectOptionHandle<T>>,
): SelectVirtualizedNavigator<T> {
  return new VirtualizedNavigator(deps, {
    posOf: (o) => o.posInSet(),
    idOf: (o) => o.id(),
    hostOf: (o) => o.host,
    isDisabled: (o) => o.disabled(),
    readEntry: (o) => {
      const id = o.id();
      const value = o.value();
      return isUnset(value) ? null : { id, value, disabled: o.disabled() };
    },
  });
}
