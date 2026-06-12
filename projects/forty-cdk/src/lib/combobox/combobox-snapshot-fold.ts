import { linkedSignal, type Signal, type WritableSignal } from '@angular/core';

import type { ForComboboxOptionHandle } from './combobox-context';

/** Source tracked by every combobox snapshot fold: the live window + its total. */
interface FoldSource<T> {
  readonly total: number | undefined;
  readonly items: readonly ForComboboxOptionHandle<T>[];
}

/**
 * Builds the `linkedSignal` shared by `OptionLabelCache` and
 * `VirtualizedNavigator`. Both fold the live `items()` window into an
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
 * @param items Live registered options. The same signal the host exposes.
 * @param totalCount Total option count (virtualized) or `undefined`.
 * @param empty Produces a fresh, empty accumulator (used on a `totalCount`
 *   transition and as the initial `prev`).
 * @param fold Overlays the current `items` window onto the carried-over
 *   accumulator and returns the next accumulator.
 */
export function foldSnapshotOnTotalCountTransition<T, A>(
  items: Signal<readonly ForComboboxOptionHandle<T>[]>,
  totalCount: Signal<number | undefined>,
  empty: () => A,
  fold: (prev: A, items: readonly ForComboboxOptionHandle<T>[]) => A,
): WritableSignal<A> {
  return linkedSignal<FoldSource<T>, A>({
    source: () => ({ total: totalCount(), items: items() }),
    computation: ({ total, items: window }, prev) => {
      if (prev && prev.source.total !== total) {
        return empty();
      }
      return fold(prev?.value ?? empty(), window);
    },
  });
}

/**
 * Read a handle's inputs inside a snapshot fold, tolerating the NG0950 thrown
 * while a statically-rendered option is in the gap between registering (its
 * constructor, during the content view's *creation* pass) and having its
 * `input.required` `[value]` binding written (that view's *update* pass). The
 * host view's effect flush — which primes these folds — runs in that gap, so a
 * static option above a `@for` list would otherwise hard-crash on open.
 *
 * Returns `null` in that window; the caller skips the option for this fold.
 * The required-input signal's producer is accessed *before* the read throws,
 * so the dependency is still tracked: writing the binding marks the fold's
 * `linkedSignal` dirty and it re-runs, folding the option in once its value is
 * set. Any non-NG0950 error propagates unchanged.
 */
export function tryReadHandle<R>(read: () => R): R | null {
  try {
    return read();
  } catch (error) {
    if (isRequiredInputUnset(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * NG0950 — `RuntimeError(-950)` — is thrown when an `input.required` is read
 * before its binding is written. Detected via the stable numeric `code` rather
 * than the message text (which is stripped in production builds).
 */
function isRequiredInputUnset(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as Error & { code?: unknown }).code;
  return typeof code === 'number' && Math.abs(code) === 950;
}
