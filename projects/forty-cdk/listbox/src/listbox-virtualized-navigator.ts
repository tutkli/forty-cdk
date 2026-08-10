import { VirtualizedNavigator, type VirtualizedNavigatorDeps } from 'forty-cdk/core';
import type { ForListboxOptionHandle } from './listbox-context';

/**
 * Position-snapshot entry for `ForListbox`. The listbox never reads option
 * values off the snapshot, so the engine's minimal shape is the whole entry.
 */
export interface ListboxPositionEntry {
  /** Stable option host id — the activedescendant target. */
  readonly id: string;
  /** Whether the option is disabled, so navigation skips over it. */
  readonly disabled: boolean;
}

/** The shared navigation engine as `ForListbox` parameterises it. */
export type ListboxVirtualizedNavigator<T> = VirtualizedNavigator<
  ForListboxOptionHandle<T>,
  ListboxPositionEntry
>;

/**
 * Wire the shared `forty-cdk/core` navigation engine to the listbox option
 * handle. The snapshot needs only the id + disabled flag, so no unwritten-binding
 * guard is required on `readEntry`.
 *
 * Internal — not re-exported from `listbox/index.ts` or `public-api.ts`.
 */
export function createListboxVirtualizedNavigator<T>(
  deps: VirtualizedNavigatorDeps<ForListboxOptionHandle<T>>,
): ListboxVirtualizedNavigator<T> {
  return new VirtualizedNavigator(deps, {
    posOf: (o) => o.posInSet(),
    idOf: (o) => o.id(),
    hostOf: (o) => o.host,
    isDisabled: (o) => o.disabled(),
    readEntry: (o) => ({ id: o.id(), disabled: o.disabled() }),
  });
}
