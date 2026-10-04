import { isUnset, VirtualizedNavigator, type VirtualizedNavigatorDeps } from 'forty-cdk/core';
import type { ForListboxOptionHandle } from './listbox-context';

/**
 * Position-snapshot entry for `ForListbox`. Carries the option's raw `value` and
 * its accessible text on top of the engine's `id` / `disabled`, so the root can
 * activate — and match a typeahead against — an option outside the rendered
 * window.
 */
export interface ListboxPositionEntry<T> {
  /** Stable option host id — the activedescendant target. */
  readonly id: string;
  /** The option's raw value, matched against a retained resume position by `compareWith`. */
  readonly value: T;
  /** The option's accessible text, matched by the virtualized typeahead. */
  readonly label: string;
  /** Whether the option is disabled, so navigation skips over it. */
  readonly disabled: boolean;
}

/** The shared navigation engine as `ForListbox` parameterises it. */
export type ListboxVirtualizedNavigator<T> = VirtualizedNavigator<
  ForListboxOptionHandle<T>,
  ListboxPositionEntry<T>
>;

/**
 * Wire the shared `forty-cdk/core` navigation engine to the listbox option
 * handle: the handle carries its absolute `posInSet` and its raw `value`, and an
 * option whose `[value]` binding is not written yet is skipped this fold and
 * folded in on the binding's re-run. Scroll-into-view is routed through
 * `scrollActiveIntoView` so the root's pointer-suppression window opens first — a
 * synthetic `pointermove` from the scroll must not hijack the highlight.
 *
 * Internal — not re-exported from `listbox/index.ts` or `public-api.ts`.
 */
export function createListboxVirtualizedNavigator<T>(
  deps: VirtualizedNavigatorDeps<ForListboxOptionHandle<T>>,
  scrollActiveIntoView: (host: HTMLElement) => void,
): ListboxVirtualizedNavigator<T> {
  return new VirtualizedNavigator(deps, {
    posOf: (o) => o.posInSet(),
    idOf: (o) => o.id(),
    hostOf: (o) => o.host,
    isDisabled: (o) => o.disabled(),
    readEntry: (o) => {
      const id = o.id();
      const value = o.value();
      return isUnset(value) ? null : { id, value, label: o.label(), disabled: o.disabled() };
    },
    scrollIntoView: (host) => scrollActiveIntoView(host),
  });
}
