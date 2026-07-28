import { type Signal } from '@angular/core';

import { tryReadHandle } from '../signal-graph/read-handle';
import { foldSnapshotOnTotalCountTransition } from './fold-snapshot';

/**
 * Minimal option-handle shape a {@link LabelSnapshot} folds. Every member is a
 * `Signal` so the fold never peeks at `textContent` — a handle carrying extra
 * members (`posInSet`, `host`, …) satisfies it structurally.
 */
export interface LabelSnapshotHandle<T> {
  /** Stable host `id` — the activedescendant target in the virtualized path. */
  readonly id: Signal<string>;
  /** The option's underlying value. */
  readonly value: Signal<T>;
  /** The option's resolved display label. */
  readonly label: Signal<string>;
  /** Whether the option is disabled. */
  readonly disabled: Signal<boolean>;
}

/**
 * One entry of a value-keyed label snapshot. The superset both consumers need:
 * the stable id (activedescendant / off-window resolution), the underlying
 * value, the resolved label string, and the `disabled` flag so inline
 * autocomplete can skip disabled options scrolled out of view.
 */
export interface LabelSnapshotEntry<T> {
  readonly id: string;
  readonly value: T;
  readonly label: string;
  readonly disabled: boolean;
}

/**
 * Fold accumulator: the accumulated entries (persisted across close / open for
 * the label fallback) plus the set of serialized values that were live in the
 * most recent non-empty window. `liveKeys` is what lets
 * {@link LabelSnapshot.liveEntries} drop options the consumer removed from the
 * source without disturbing the accumulated snapshot the fallback relies on.
 */
interface LabelSnapshotState<T> {
  readonly entries: readonly LabelSnapshotEntry<T>[];
  readonly liveKeys: ReadonlySet<string>;
}

/**
 * Dependencies of a {@link LabelSnapshot}. Plain signals — the snapshot never
 * injects a primitive's context token, so both roots construct it from their
 * own registries.
 */
export interface LabelSnapshotDeps<T> {
  /** Live registered option handles. The same signal the root exposes. */
  readonly items: Signal<readonly LabelSnapshotHandle<T>[]>;
  /** Total option count (virtualized) or `undefined`. */
  readonly totalCount: Signal<number | undefined>;
  /** Serializes an item to the key the snapshot is keyed by. */
  readonly itemToFormValue: Signal<(item: T) => string>;
  /**
   * Whether a non-empty window carries the previous accumulator forward.
   * Defaults to always carrying over (Combobox), which keeps every label ever
   * registered resolvable. Pass a signal to make persistence conditional: a
   * select that renders its full option set while open passes its
   * `virtualized` signal, so the non-virtualized fold rebuilds from the live
   * window and an option the consumer removed while the listbox is open is
   * purged from {@link LabelSnapshot.entries} rather than lingering.
   */
  readonly carryOver?: Signal<boolean>;
}

/**
 * Value-keyed label snapshot shared by `[forSelect]` and `[forCombobox]`. Folds
 * the live option window into a flat list of {@link LabelSnapshotEntry} tuples
 * keyed by serialized form value, so both roots resolve a selected value's
 * label without the options being mounted.
 *
 * Persistence: when the consumer's `@if` unmounts the content
 * (`items().length === 0`) the prior accumulator is carried over, so labels
 * outside the listbox keep resolving while closed. Resets only when the
 * consumer's `totalCount` transitions — a query / source rebuild signal in the
 * virtualized case. The stale-window invariant behind that reset lives in
 * {@link foldSnapshotOnTotalCountTransition}: a `totalCount` flip can race
 * ahead of `items()` in the same serial commit, so the transition restarts from
 * an empty accumulator without folding the stale window, and the fold resumes
 * on the next run once `items` catches up.
 *
 * Two projections read the fold: {@link entries} is the full accumulated
 * snapshot (a label fallback must survive an option leaving the rendered set),
 * while {@link liveEntries} is purge-aware — it drops entries whose option is
 * no longer in the live window, so a completion never offers an option the
 * consumer removed from the source.
 *
 * Internal helper — not part of the blessed core tier and never surfaced on a
 * primitive's public context. Constructed once per root.
 */
export class LabelSnapshot<T> {
  readonly #state: Signal<LabelSnapshotState<T>>;
  readonly #itemToFormValue: Signal<(item: T) => string>;

  constructor(deps: LabelSnapshotDeps<T>) {
    this.#itemToFormValue = deps.itemToFormValue;
    const carryOver = deps.carryOver;
    this.#state = foldSnapshotOnTotalCountTransition<LabelSnapshotHandle<T>, LabelSnapshotState<T>>(
      deps.items,
      deps.totalCount,
      () => ({ entries: [], liveKeys: new Set<string>() }),
      (prev, items) => {
        if (items.length === 0) {
          return prev;
        }
        const toFormValue = deps.itemToFormValue();
        const merged = new Map<string, LabelSnapshotEntry<T>>();
        if (carryOver === undefined || carryOver()) {
          for (const entry of prev.entries) {
            merged.set(toFormValue(entry.value), entry);
          }
        }
        const liveKeys = new Set<string>();
        for (const item of items) {
          // A static option (rendered outside `@for`) registers before its
          // `[value]` binding is written; skip it this fold and pick it up on
          // the re-run the binding triggers. See `tryReadHandle`.
          const entry = tryReadHandle(() => ({
            id: item.id(),
            value: item.value(),
            label: item.label(),
            disabled: item.disabled(),
          }));
          if (entry === null) {
            continue;
          }
          const key = toFormValue(entry.value);
          merged.set(key, entry);
          liveKeys.add(key);
        }
        return { entries: [...merged.values()], liveKeys };
      },
      { deferOnTotalTransition: true },
    );
  }

  /**
   * Pull the snapshot so its `linkedSignal` `prev` slot gets seeded while the
   * listbox is open. Called from the root's bridge effect — without an eager
   * pull the lazy fold never runs during the open cycle (no other consumer
   * pulls it in non-virtualized usage), and persistence across close → re-open
   * would start from an empty `prev`. Priming on every live window is also what
   * keeps {@link liveEntries} purge-aware: a removed option is dropped from the
   * live keys on the fold that runs while the shrunken window is mounted.
   */
  prime(): void {
    this.#state();
  }

  /**
   * Full accumulated snapshot. Drives the label fallbacks that must keep
   * resolving a value's label after its option leaves the rendered set.
   */
  entries(): readonly LabelSnapshotEntry<T>[] {
    return this.#state().entries;
  }

  /**
   * Purge-aware projection: only the entries whose option was present in the
   * most recent non-empty window. Drives matching that must stop offering an
   * option the consumer removed from the source, while {@link entries} keeps it
   * for the label fallback.
   */
  liveEntries(): readonly LabelSnapshotEntry<T>[] {
    const { entries, liveKeys } = this.#state();
    const toFormValue = this.#itemToFormValue();
    return entries.filter((entry) => liveKeys.has(toFormValue(entry.value)));
  }

  /**
   * Accumulated entries merged with any off-window entries from a virtualized
   * position-map, so typeahead and inline autocomplete can match against
   * options scrolled out of view. Accumulated entries take precedence (freshest
   * data) and appear first, followed by off-window indexed entries sorted by
   * absolute position. Pass an empty / zero-size map (the non-virtualized case)
   * to get the accumulated entries unchanged.
   */
  mergedEntries(
    indexed: ReadonlyMap<number, LabelSnapshotEntry<T>>,
  ): readonly LabelSnapshotEntry<T>[] {
    const accumulated = this.#state().entries;
    if (indexed.size === 0) {
      return accumulated;
    }
    const toFormValue = this.#itemToFormValue();
    const seen = new Set(accumulated.map((o) => toFormValue(o.value)));
    const merged: LabelSnapshotEntry<T>[] = [...accumulated];
    const positions = [...indexed.keys()].sort((a, b) => a - b);
    for (const pos of positions) {
      const entry = indexed.get(pos)!;
      if (seen.has(toFormValue(entry.value))) {
        continue;
      }
      merged.push({
        id: entry.id,
        value: entry.value,
        label: entry.label,
        disabled: entry.disabled,
      });
    }
    return merged;
  }
}
