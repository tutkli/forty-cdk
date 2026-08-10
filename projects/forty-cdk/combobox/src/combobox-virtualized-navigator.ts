import {
  isUnset,
  type LabelCacheEntry,
  VirtualizedNavigator,
  type VirtualizedNavigatorDeps,
} from 'forty-cdk/core';
import type { ForComboboxOptionHandle } from './combobox-context';

/** The shared navigation engine as `ForCombobox` parameterises it. */
export type ComboboxVirtualizedNavigator<T> = VirtualizedNavigator<
  ForComboboxOptionHandle<T>,
  LabelCacheEntry<T>
>;

/**
 * Wire the shared `forty-cdk/core` navigation engine to the combobox option
 * handle: `posInSet` is optional here (an option registered outside a virtualized
 * window carries none), the snapshot entry doubles as a label-cache entry so the
 * scrolled-out-of-view label fallback can read it, an option whose `[value]`
 * binding is not written yet is skipped this fold, and scroll-into-view is
 * routed through `scrollActiveIntoView` so the host's pointer-suppression window
 * opens first — a synthetic `pointermove` from the scroll must not hijack the
 * activedescendant.
 *
 * `deferFoldOnTotalTransition` is the combobox-only tunable: a `totalCount` flip
 * (a query / source rebuild) can fire while `items()` still holds the previous
 * window, so the snapshot empties without folding the stale entries and waits
 * for `items` to catch up.
 *
 * Internal — not re-exported from `combobox/index.ts` or `public-api.ts`.
 */
export function createComboboxVirtualizedNavigator<T>(
  deps: VirtualizedNavigatorDeps<ForComboboxOptionHandle<T>>,
  scrollActiveIntoView: (host: HTMLElement) => void,
): ComboboxVirtualizedNavigator<T> {
  return new VirtualizedNavigator(
    deps,
    {
      posOf: (o) => o.posInSet?.() ?? null,
      idOf: (o) => o.id(),
      hostOf: (o) => o.host,
      isDisabled: (o) => o.disabled(),
      readEntry: (o) => {
        const id = o.id();
        const value = o.value();
        return isUnset(value) ? null : { id, value, label: o.label(), disabled: o.disabled() };
      },
      scrollIntoView: (host) => scrollActiveIntoView(host),
    },
    { deferFoldOnTotalTransition: true },
  );
}
