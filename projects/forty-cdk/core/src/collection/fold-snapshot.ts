import { linkedSignal, type Signal, type WritableSignal } from '@angular/core';

/** Source tracked by every snapshot fold: the live window + its total. */
interface FoldSource<H> {
  readonly total: number | undefined;
  readonly items: readonly H[];
}

/**
 * Builds the `linkedSignal` shared by the combobox label cache and the
 * virtualized navigators. Both fold the live `items()` window into an
 * accumulator that persists across listbox close / open cycles and resets when
 * the consumer's `totalCount` transitions.
 *
 * The stale-window invariant lives here, in one place: on a `totalCount`
 * transition the `items()` array may still hold the previous window (signal
 * commits run serially, so the `@for` re-render hasn't unregistered the old
 * options yet), so the fold restarts from `empty()` on that compute and the
 * next run — fired when `items` catches up — folds the fresh window into a
 * clean carry-over accumulator.
 *
 * @typeParam H Handle type folded into the accumulator.
 * @typeParam A Accumulator shape.
 * @param items Live registered handles. The same signal the host exposes.
 * @param totalCount Total handle count (virtualized) or `undefined`.
 * @param empty Produces a fresh, empty accumulator (used on a `totalCount`
 *   transition and as the initial `prev`).
 * @param fold Overlays the current `items` window onto the carried-over
 *   accumulator and returns the next accumulator.
 */
export function foldSnapshotOnTotalCountTransition<H, A>(
  items: Signal<readonly H[]>,
  totalCount: Signal<number | undefined>,
  empty: () => A,
  fold: (prev: A, items: readonly H[]) => A,
): WritableSignal<A> {
  return linkedSignal<FoldSource<H>, A>({
    source: () => ({ total: totalCount(), items: items() }),
    computation: ({ total, items: window }, prev) => {
      if (prev && prev.source.total !== total) {
        return empty();
      }
      return fold(prev?.value ?? empty(), window);
    },
  });
}
