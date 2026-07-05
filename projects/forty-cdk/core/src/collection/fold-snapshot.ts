import { linkedSignal, type Signal, type WritableSignal } from '@angular/core';

/**
 * Source tracked by every snapshot fold: the live window, its total, and the
 * monotonic data version. `version` bumps whenever the consumer asks for a
 * from-empty rebuild (a same-length re-sort / refresh) so a stable `total`
 * still resets the accumulator on that run.
 */
interface FoldSource<H> {
  readonly total: number | undefined;
  readonly items: readonly H[];
  readonly version: unknown;
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
 * A same-length dataset refresh (a re-sort or reload that keeps `totalCount`
 * unchanged) is invisible to the `total` diff, so the caller can drive the same
 * reset through the optional `dataVersion` signal: a monotonic signal that
 * bumps on such a refresh.
 *
 * @typeParam H Handle type folded into the accumulator.
 * @typeParam A Accumulator shape.
 * @param items Live registered handles. The same signal the host exposes.
 * @param totalCount Total handle count (virtualized) or `undefined`.
 * @param empty Produces a fresh, empty accumulator (used on a `totalCount`
 *   transition / data-version bump and as the initial `prev`).
 * @param fold Overlays the current `items` window onto the carried-over
 *   accumulator and returns the next accumulator.
 * @param options Fold policy. `deferOnTotalTransition` (default `false`)
 *   governs **only** the `totalCount` transition: when `true`, a transition
 *   restarts from `empty()` **without folding** the stale window in the same
 *   compute, deferring the fold to the next run once `items` catches up
 *   (Combobox), because a `totalCount` flip can race ahead of `items()` in the
 *   same serial commit; `false` also folds the current window into the fresh
 *   accumulator (Select / Listbox / Tree). `dataVersion`: an optional monotonic
 *   "data changed" signal that, when it changes, rebuilds the accumulator from
 *   `empty()` **and folds the current window** in the same compute regardless of
 *   `deferOnTotalTransition` — an explicit refresh is not the `totalCount` race,
 *   so the caller's freshly-rendered window is folded immediately rather than
 *   deferred. This is the escape hatch for a same-length dataset refresh
 *   (re-sort / reload) invisible to the `total` diff.
 */
export function foldSnapshotOnTotalCountTransition<H, A>(
  items: Signal<readonly H[]>,
  totalCount: Signal<number | undefined>,
  empty: () => A,
  fold: (prev: A, items: readonly H[]) => A,
  options: {
    readonly deferOnTotalTransition?: boolean;
    readonly dataVersion?: Signal<unknown>;
  } = {},
): WritableSignal<A> {
  const defer = options.deferOnTotalTransition === true;
  const dataVersion = options.dataVersion;
  return linkedSignal<FoldSource<H>, A>({
    source: () => ({ total: totalCount(), items: items(), version: dataVersion?.() }),
    computation: ({ total, items: window, version }, prev) => {
      const versionChanged = prev !== undefined && prev.source.version !== version;
      if (versionChanged) {
        return fold(empty(), window);
      }
      const totalChanged = prev !== undefined && prev.source.total !== total;
      if (totalChanged) {
        return defer ? empty() : fold(empty(), window);
      }
      return fold(prev?.value ?? empty(), window);
    },
  });
}
