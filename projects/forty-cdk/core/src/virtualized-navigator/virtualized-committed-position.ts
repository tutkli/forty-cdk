import { lookupByValue } from '../selection/selection';
import type { VirtualizedResumeEntry } from './virtualized-resume';

/** What {@link resolveCommittedPosition} reads to place the committed selection. */
export interface CommittedPositionQuery<T> {
  /** The committed values, in selection order. */
  readonly values: readonly T[];
  /** The navigator's position snapshot. */
  readonly snapshotByPos: ReadonlyMap<number, VirtualizedResumeEntry<T>>;
  /** Item identity, used to match a committed value against a snapshot entry. */
  readonly compareWith: (a: T, b: T) => boolean;
  /** The consumer's absolute index hint for a selection that was never rendered. */
  readonly selectedIndex: number | undefined;
  /** Full source length; a hint at or past it is ignored. */
  readonly totalCount: number | undefined;
}

/**
 * The absolute position a virtualized activedescendant collection seeds when it
 * lands on its committed selection: the first committed value whose enabled
 * entry is in the position snapshot, else the consumer's `selectedIndex` hint
 * when it is in range, else `null`. An empty selection resolves to `null`, so a
 * stale hint never seeds a collection with nothing selected.
 *
 * The caller seeds the result through the navigator's `seedActive`, which emits
 * `(scrollToIndex)` when the position is outside the rendered window.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export function resolveCommittedPosition<T>(query: CommittedPositionQuery<T>): number | null {
  if (query.values.length === 0) {
    return null;
  }
  const byValue = lookupByValue(
    [...query.snapshotByPos].filter(([, entry]) => !entry.disabled),
    ([, entry]) => entry.value,
    query.compareWith,
  );
  for (const value of query.values) {
    const hit = byValue(value);
    if (hit) {
      return hit[0];
    }
  }
  const { selectedIndex, totalCount } = query;
  if (
    selectedIndex === undefined ||
    totalCount === undefined ||
    selectedIndex < 0 ||
    selectedIndex >= totalCount
  ) {
    return null;
  }
  return selectedIndex;
}
