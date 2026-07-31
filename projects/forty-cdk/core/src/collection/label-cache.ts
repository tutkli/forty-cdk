import { computed, linkedSignal, type Signal } from '@angular/core';

import { tryReadHandle } from '../signal-graph/read-handle';

/**
 * Minimal option-handle shape a {@link LabelCache} reads. Every member is a
 * `Signal` so the cache never peeks at `textContent` — a handle carrying extra
 * members (`posInSet`, `host`, …) satisfies it structurally.
 */
export interface LabelCacheHandle<T> {
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
 * One cached option tuple. The superset both consumers need: the stable id
 * (activedescendant / off-window resolution), the underlying value, the resolved
 * label string, and the `disabled` flag so inline autocomplete can skip disabled
 * options that are no longer rendered.
 */
export interface LabelCacheEntry<T> {
  readonly id: string;
  readonly value: T;
  readonly label: string;
  readonly disabled: boolean;
}

/**
 * Cache state. Two bounded stores, both rebuilt by the same computation:
 *
 * - `windowByKey` — the most recent **non-empty** option window, keyed by
 *   serialized form value. Replaced wholesale on every non-empty window, so it
 *   is bounded by the size of one window and an option the consumer removed from
 *   the source is purged on the next window rather than lingering.
 * - `selected` — the entries whose serialized value is currently selected.
 *   Bounded by the selection size.
 */
interface LabelCacheState<T> {
  readonly windowByKey: ReadonlyMap<string, LabelCacheEntry<T>>;
  readonly selected: ReadonlyMap<string, LabelCacheEntry<T>>;
}

/** Tracked source of the cache: the live window, the selection, and the key fn. */
interface LabelCacheSource<T> {
  readonly items: readonly LabelCacheHandle<T>[];
  readonly value: readonly T[];
  readonly toFormValue: (item: T) => string;
}

/**
 * Dependencies of a {@link LabelCache}. Plain signals — the cache never injects
 * a primitive's context token, so both roots construct it from their own
 * registries.
 */
export interface LabelCacheDeps<T> {
  /** Live registered option handles. The same signal the root exposes. */
  readonly items: Signal<readonly LabelCacheHandle<T>[]>;
  /** The root's selection model, so selected labels survive an unmount. */
  readonly value: Signal<readonly T[]>;
  /** Serializes an item to the key the cache is keyed by. */
  readonly itemToFormValue: Signal<(item: T) => string>;
}

const EMPTY_STATE: LabelCacheState<never> = { windowByKey: new Map(), selected: new Map() };

/**
 * Bounded option-label cache shared by `[forSelect]` and `[forCombobox]`. Both
 * roots must resolve labels for options that are not mounted — the live registry
 * is empty whenever the consumer's `@if` unmounts the listbox — and both must do
 * it without retaining every option they have ever seen.
 *
 * Two projections, each bounded by a different quantity:
 *
 * - {@link selectedEntries} carries the entries of the **currently selected**
 *   values, so `[forSelectValue]`, the combobox chips and the combobox input
 *   label keep resolving after the options unmount, and across a query rebuild
 *   that no longer contains the selected value. Bounded by the selection size:
 *   a value that leaves the selection leaves the cache with it.
 * - {@link windowEntries} carries the most recent non-empty option window,
 *   replaced rather than merged. It backs the two matchers that must see labels
 *   the selection does not contain — the closed-state typeahead of `[forSelect]`
 *   and the closed-state inline completion of `[forComboboxInput]`. Bounded by
 *   one window, and purge-aware for free: an option the consumer removed while
 *   the listbox is open is gone from the next window.
 *
 * The replace semantics are what remove the reset machinery a merging
 * accumulator needed. There is no `totalCount` transition to detect, no
 * data-version bump to honour and no stale-window race to document: a window
 * that lands is the whole store, and a window that races ahead of its
 * `totalCount` is simply the previous window, replaced on the run that follows.
 * The virtualized consequence is deliberate — with one window in the store at a
 * time, `windowEntries` covers the rendered slice rather than every slice
 * scrolled through, so a virtualized closed-state match is scoped to the last
 * window. Selected labels are unaffected: they live in the other projection,
 * keyed by the selection.
 *
 * A statically-rendered option registers during the content view's *creation*
 * pass, before its `input.required` `[value]` binding is written in that view's
 * *update* pass, and {@link prime} pulls the cache inside that gap. Such a
 * handle is skipped for that run and folded in on the re-run the binding
 * triggers, via `tryReadHandle`.
 *
 * Internal helper — not part of the blessed core tier and never surfaced on a
 * primitive's public context. Constructed once per root.
 */
export class LabelCache<T> {
  readonly #state: Signal<LabelCacheState<T>>;

  readonly #selectedEntries: Signal<readonly LabelCacheEntry<T>[]>;

  readonly #windowEntries: Signal<readonly LabelCacheEntry<T>[]>;

  constructor(deps: LabelCacheDeps<T>) {
    this.#state = linkedSignal<LabelCacheSource<T>, LabelCacheState<T>>({
      source: () => ({
        items: deps.items(),
        value: deps.value(),
        toFormValue: deps.itemToFormValue(),
      }),
      computation: ({ items, value, toFormValue }, prev) => {
        const previous: LabelCacheState<T> = prev?.value ?? EMPTY_STATE;
        const windowByKey =
          items.length === 0 ? previous.windowByKey : readWindow(items, toFormValue);
        const selected = new Map<string, LabelCacheEntry<T>>();
        for (const item of value) {
          const key = toFormValue(item);
          const entry = windowByKey.get(key) ?? previous.selected.get(key);
          if (entry !== undefined) {
            selected.set(key, entry);
          }
        }
        return { windowByKey, selected };
      },
    });
    this.#selectedEntries = computed(() => [...this.#state().selected.values()]);
    this.#windowEntries = computed(() => [...this.#state().windowByKey.values()]);
  }

  /**
   * Pull the cache so the window store observes the mounted options. Called from
   * the root's bridge effect while the listbox is open.
   *
   * This read is the one thing the cache cannot derive for itself: the option
   * window is transient, and a lazy computation only ever sees the source as it
   * stands when something reads it. `selectedEntries` is pulled naturally — by
   * whatever renders the selected label — but the window store has no such
   * reader during the open cycle, so a consumer who renders no selected label
   * (or none yet) would leave it empty and the closed-state matchers with
   * nothing to match against. A read, not a write: forcing a lazy derivation to
   * run is a side effect, not state propagation.
   */
  prime(): void {
    this.#state();
  }

  /**
   * Cached entries for the currently selected values, in selection order. A
   * selected value with no cached entry is absent rather than represented — the
   * caller owns the fallback (a consumer `itemToLabel`, else the serialized
   * value).
   */
  selectedEntries(): readonly LabelCacheEntry<T>[] {
    return this.#selectedEntries();
  }

  /**
   * The most recent non-empty option window, in DOM order and de-duplicated by
   * serialized form value. Drives the closed-state matchers; empty until the
   * first window is observed.
   */
  windowEntries(): readonly LabelCacheEntry<T>[] {
    return this.#windowEntries();
  }
}

function readWindow<T>(
  items: readonly LabelCacheHandle<T>[],
  toFormValue: (item: T) => string,
): ReadonlyMap<string, LabelCacheEntry<T>> {
  const byKey = new Map<string, LabelCacheEntry<T>>();
  for (const item of items) {
    const entry = tryReadHandle(() => ({
      id: item.id(),
      value: item.value(),
      label: item.label(),
      disabled: item.disabled(),
    }));
    if (entry === null) {
      continue;
    }
    byKey.set(toFormValue(entry.value), entry);
  }
  return byKey;
}
