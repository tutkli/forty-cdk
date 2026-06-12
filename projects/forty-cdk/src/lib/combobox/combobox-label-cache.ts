import { type Signal } from '@angular/core';

import { foldSnapshotOnTotalCountTransition, tryReadHandle } from './combobox-snapshot-fold';
import type { ForComboboxOptionHandle } from './combobox-context';

/**
 * Plain entry in the label cache / position-keyed map. Mirrors what inline
 * autocomplete and the chip / `selected` fallback paths need: a stable id, the
 * underlying value, and the resolved label string.
 */
export interface SnapshotEntry<T> {
  readonly id: string;
  readonly value: T;
  readonly label: string;
}

/**
 * Always-on label cache for `ForCombobox`. Keeps a flat list of
 * `{ id, value, label }` tuples that persists across listbox close / open
 * cycles, driving inline autocomplete and the `selected` label fallback.
 *
 * Persistence: when the consumer's `@if` unmounts the content
 * (`items().length === 0`) the prior cache is carried over so chips outside
 * the listbox area and inline completion after close keep resolving labels.
 * Resets only when the consumer's `totalCount` transitions — a query / source
 * rebuild signal in the virtualized case (the shared stale-window invariant
 * lives in `combobox-snapshot-fold.ts`).
 *
 * The option's `label` is itself a `Signal<string>` so we never peek at
 * `textContent`. Internal helper — not re-exported from `combobox/index.ts`
 * or `public-api.ts`. Constructed once per host directive, on every combobox
 * (virtualized or not).
 */
export class OptionLabelCache<T> {
  readonly #cachedOptions: Signal<readonly SnapshotEntry<T>[]>;

  constructor(deps: {
    readonly items: Signal<readonly ForComboboxOptionHandle<T>[]>;
    readonly totalCount: Signal<number | undefined>;
  }) {
    this.#cachedOptions = foldSnapshotOnTotalCountTransition<T, readonly SnapshotEntry<T>[]>(
      deps.items,
      deps.totalCount,
      () => [],
      (prev, items) => {
        if (items.length === 0) {
          return prev;
        }
        const merged = new Map<string, SnapshotEntry<T>>();
        for (const entry of prev) {
          merged.set(entry.id, entry);
        }
        for (const item of items) {
          // A static option (rendered outside `@for`) registers before its
          // `[value]` binding is written; skip it this fold and pick it up on
          // the re-run the binding triggers. See `tryReadHandle`.
          const entry = tryReadHandle(() => ({
            id: item.id(),
            value: item.value(),
            label: item.label(),
          }));
          if (entry === null) {
            continue;
          }
          merged.set(entry.id, entry);
        }
        return [...merged.values()];
      },
    );
  }

  /**
   * Pull the cache so its `linkedSignal` `prev` slot gets seeded while the
   * listbox is open. Called from the host's bridge effect — without an eager
   * pull the lazy cache never runs during the open cycle (no other consumer
   * pulls it in non-virtualized usage), and persistence across close → re-open
   * would start from an empty `prev`.
   */
  prime(): void {
    this.#cachedOptions();
  }

  /**
   * Snapshot of the registered options as plain `{ id, value, label }` tuples.
   * Drives inline-autocomplete matching and the label-resolution fallback in
   * `ForCombobox.selected`.
   */
  entries(): readonly SnapshotEntry<T>[] {
    return this.#cachedOptions();
  }
}
