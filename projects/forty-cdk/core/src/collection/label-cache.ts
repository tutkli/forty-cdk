import { computed, linkedSignal, type Signal } from '@angular/core';

import { isUnset } from '../unset-input/unset-input';

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

/** Tracked source of the window store: the live handles and the key fn. */
interface WindowSource<T> {
  readonly items: readonly LabelCacheHandle<T>[];
  readonly toFormValue: (item: T) => string;
}

/** Tracked source of the selection store: the window store, the selection, and the key fn. */
interface SelectionSource<T> {
  readonly window: ReadonlyMap<string, LabelCacheEntry<T>>;
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

const EMPTY_WINDOW = new Map<string, LabelCacheEntry<never>>();

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
 * They are two separate `linkedSignal`s rather than one holding both stores, so
 * the selection is not a dependency of the window read: a commit of `value`
 * rebuilds the selection map alone (bounded by the selection) instead of
 * re-reading every handle in the window, and — because {@link prime} is the
 * cache's only eager reader — the roots' pull effect does not drag the selection
 * into the tracked set of anything else that shares it.
 *
 * The replace semantics are what remove the reset machinery a merging
 * accumulator needed. There is no `totalCount` transition to detect, no
 * data-version bump to honour and no stale-window race to document: a window
 * that lands is the whole store, and a window that races ahead of its
 * `totalCount` is simply the previous window, replaced on the run that follows.
 * The virtualized consequence is deliberate — with one window in the store at a
 * time, `windowEntries` covers the rendered slice rather than every slice
 * scrolled through, so a virtualized closed-state match is scoped to the last
 * window. A label that is already selected is unaffected — it lives in the other
 * projection and is carried for as long as the value stays selected — but neither
 * projection consults a virtualized position map, so a value that *enters* the
 * selection while its option sits outside the current window resolves only if it
 * was cached on an earlier window. The caller owns that fallback, and
 * `[forCombobox]` overlays the position map onto `windowEntries` for its
 * completion matcher only.
 *
 * A statically-rendered option registers during the content view's *creation*
 * pass, before its `[value]` binding is written in that view's *update* pass,
 * and {@link prime} pulls the cache inside that gap. Such a handle reads the
 * `unsetInput` sentinel, is skipped for that run, and folds in on the re-run
 * the binding triggers.
 *
 * Internal helper — not part of the blessed core tier and never surfaced on a
 * primitive's public context. Constructed once per root.
 */
export class LabelCache<T> {
  readonly #windowByKey: Signal<ReadonlyMap<string, LabelCacheEntry<T>>>;

  readonly #selectedByKey: Signal<ReadonlyMap<string, LabelCacheEntry<T>>>;

  readonly #selectedEntries: Signal<readonly LabelCacheEntry<T>[]>;

  readonly #windowEntries: Signal<readonly LabelCacheEntry<T>[]>;

  constructor(deps: LabelCacheDeps<T>) {
    this.#windowByKey = linkedSignal<WindowSource<T>, ReadonlyMap<string, LabelCacheEntry<T>>>({
      source: () => ({ items: deps.items(), toFormValue: deps.itemToFormValue() }),
      computation: ({ items, toFormValue }, prev) =>
        items.length === 0 ? (prev?.value ?? EMPTY_WINDOW) : readWindow(items, toFormValue),
    });
    this.#selectedByKey = linkedSignal<SelectionSource<T>, ReadonlyMap<string, LabelCacheEntry<T>>>(
      {
        source: () => ({
          window: this.#windowByKey(),
          value: deps.value(),
          toFormValue: deps.itemToFormValue(),
        }),
        computation: ({ window, value, toFormValue }, prev) => {
          const selected = new Map<string, LabelCacheEntry<T>>();
          for (const item of value) {
            const key = toFormValue(item);
            const entry = window.get(key) ?? prev?.value.get(key);
            if (entry !== undefined) {
              selected.set(key, entry);
            }
          }
          return selected;
        },
      },
    );
    this.#selectedEntries = computed(() => [...this.#selectedByKey().values()]);
    this.#windowEntries = computed(() => [...this.#windowByKey().values()]);
  }

  /**
   * Pull both stores so they observe the mounted options. Called from a
   * dedicated read-only effect on the root, never from one that also writes:
   * pulling the cache tracks the selection, and an effect that writes
   * activedescendant must not re-run on every commit of `value`.
   *
   * This read is the one thing the cache cannot derive for itself: the option
   * window is transient, and a lazy computation only ever sees the source as it
   * stands when something reads it. `selectedEntries` is pulled naturally — by
   * whatever renders the selected label — but the window store has no such
   * reader during the open cycle, so a consumer who renders no selected label
   * (or none yet) would leave it empty and the closed-state matchers with
   * nothing to match against. The selection store is pulled here too so its
   * carried-over entries are captured while the option that owns each selected
   * value is still in the window. A read, not a write: forcing a lazy derivation
   * to run is a side effect, not state propagation.
   */
  prime(): void {
    this.#windowByKey();
    this.#selectedByKey();
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
    const id = item.id();
    const value = item.value();
    if (isUnset(value)) {
      continue;
    }
    byKey.set(toFormValue(value), { id, value, label: item.label(), disabled: item.disabled() });
  }
  return byKey;
}
