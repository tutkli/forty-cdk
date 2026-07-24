import { type Signal } from '@angular/core';

import { foldSnapshotOnTotalCountTransition, tryReadHandle } from 'forty-cdk/core';
import type { ForComboboxOptionHandle } from './combobox-context';

/**
 * Plain entry in the label cache / position-keyed map. Mirrors what inline
 * autocomplete and the chip / `selected` fallback paths need: a stable id, the
 * underlying value, the resolved label string, and the `disabled` flag so
 * inline autocomplete can skip disabled options scrolled out of view.
 */
export interface SnapshotEntry<T> {
  readonly id: string;
  readonly value: T;
  readonly label: string;
  readonly disabled: boolean;
}

/**
 * Fold accumulator: the accumulated entries (persisted across close / open for
 * the `selected` fallback) plus the set of serialized values that were live in
 * the most recent non-empty window. `liveKeys` is what lets
 * {@link OptionLabelCache.liveEntries} drop options the consumer removed from
 * the source without disturbing the accumulated snapshot the chip / `selected`
 * fallback relies on.
 */
interface LabelCacheState<T> {
  readonly entries: readonly SnapshotEntry<T>[];
  readonly liveKeys: ReadonlySet<string>;
}

/**
 * Always-on label cache for `ForCombobox`. Keeps a flat list of
 * `{ id, value, label }` tuples that persists across listbox close / open
 * cycles, driving the `selected` label fallback and inline autocomplete.
 *
 * Persistence: when the consumer's `@if` unmounts the content
 * (`items().length === 0`) the prior cache is carried over so chips outside
 * the listbox area and inline completion after close keep resolving labels.
 * Resets only when the consumer's `totalCount` transitions — a query / source
 * rebuild signal in the virtualized case (the shared stale-window invariant
 * lives in `foldSnapshotOnTotalCountTransition` from `forty-cdk/core`).
 *
 * Two projections read the fold: {@link entries} is the full accumulated
 * snapshot (chip / `selected` label fallback, which must survive an option
 * leaving the rendered set), while {@link liveEntries} is purge-aware — it
 * drops entries whose option is no longer in the live window, so inline
 * completion in the non-virtualized case never offers an option the consumer
 * removed from the source.
 *
 * The option's `label` is itself a `Signal<string>` so we never peek at
 * `textContent`. Internal helper — not re-exported from `combobox/index.ts`
 * or `public-api.ts`. Constructed once per host directive, on every combobox
 * (virtualized or not).
 */
export class OptionLabelCache<T> {
  readonly #state: Signal<LabelCacheState<T>>;
  readonly #itemToFormValue: Signal<(item: T) => string>;

  constructor(deps: {
    readonly items: Signal<readonly ForComboboxOptionHandle<T>[]>;
    readonly totalCount: Signal<number | undefined>;
    readonly itemToFormValue: Signal<(item: T) => string>;
  }) {
    this.#itemToFormValue = deps.itemToFormValue;
    this.#state = foldSnapshotOnTotalCountTransition<
      ForComboboxOptionHandle<T>,
      LabelCacheState<T>
    >(
      deps.items,
      deps.totalCount,
      () => ({ entries: [], liveKeys: new Set<string>() }),
      (prev, items) => {
        if (items.length === 0) {
          return prev;
        }
        const toFormValue = deps.itemToFormValue();
        const merged = new Map<string, SnapshotEntry<T>>();
        for (const entry of prev.entries) {
          merged.set(toFormValue(entry.value), entry);
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
   * Pull the cache so its `linkedSignal` `prev` slot gets seeded while the
   * listbox is open. Called from the host's bridge effect — without an eager
   * pull the lazy cache never runs during the open cycle (no other consumer
   * pulls it in non-virtualized usage), and persistence across close → re-open
   * would start from an empty `prev`. Priming on every live window is also what
   * keeps {@link liveEntries} purge-aware: a removed option is dropped from
   * `liveKeys` on the fold that runs while the shrunken window is mounted.
   */
  prime(): void {
    this.#state();
  }

  /**
   * Full accumulated snapshot of the registered options as plain
   * `{ id, value, label }` tuples. Drives the label-resolution fallback in
   * `ForCombobox.selected` and the chip labels — both must keep resolving a
   * value's label after its option leaves the rendered set.
   */
  entries(): readonly SnapshotEntry<T>[] {
    return this.#state().entries;
  }

  /**
   * Purge-aware projection: only the entries whose option was present in the
   * most recent non-empty window. Drives inline-autocomplete matching in the
   * non-virtualized case so an option the consumer removed from the source
   * stops being offered as a completion, while {@link entries} keeps it for the
   * `selected` fallback.
   */
  liveEntries(): readonly SnapshotEntry<T>[] {
    const { entries, liveKeys } = this.#state();
    const toFormValue = this.#itemToFormValue();
    return entries.filter((entry) => liveKeys.has(toFormValue(entry.value)));
  }

  /**
   * Live entries merged with any off-window entries from the virtualized
   * position-map, so typeahead and inline autocomplete can match against
   * options scrolled out of view. Live entries take precedence (freshest data)
   * and appear first, followed by off-window indexed entries sorted by absolute
   * position. Pass an empty / zero-size map (the non-virtualized case) to get
   * the live entries unchanged.
   */
  mergedEntries(indexed: ReadonlyMap<number, SnapshotEntry<T>>): readonly SnapshotEntry<T>[] {
    const accumulated = this.#state().entries;
    if (indexed.size === 0) {
      return accumulated;
    }
    const toFormValue = this.#itemToFormValue();
    const seen = new Set(accumulated.map((o) => toFormValue(o.value)));
    const merged: SnapshotEntry<T>[] = [...accumulated];
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
