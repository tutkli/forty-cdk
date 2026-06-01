import { linkedSignal, signal, type Signal } from '@angular/core';

import { moveIndex } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { ForComboboxOptionHandle } from './combobox-context';

/**
 * Plain entry in the cached / position-keyed snapshot. Mirrors what inline
 * autocomplete and the chip / `selected` fallback paths need: a stable id, the
 * underlying value, the resolved label string, and (for the indexed map) the
 * disabled flag so virtualized navigation can skip over off-window disabled
 * options.
 */
interface SnapshotEntry<T> {
  readonly id: string;
  readonly value: T;
  readonly label: string;
}

interface IndexedSnapshotEntry<T> extends SnapshotEntry<T> {
  readonly disabled: boolean;
}

/**
 * Constructor dependencies for `ComboboxSnapshot`. Wires the helper to the
 * host directive's signal graph + a small set of imperative callbacks. The
 * host is the only owner of the activedescendant, so the helper reads / writes
 * it through accessors instead of holding its own copy.
 */
export interface ComboboxSnapshotDeps<T> {
  /** Live registered options. Same signal the host exposes as `options`. */
  readonly items: Signal<readonly ForComboboxOptionHandle<T>[]>;
  /** Total option count for the virtualized path. `undefined` ⇒ non-virtualized. */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive range of currently rendered options when virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;
  /** Whether keyboard navigation wraps at the ends. */
  readonly loop: Signal<boolean>;
  /** Read the host's current activedescendant id. */
  readonly getActiveId: () => string | null;
  /** Write the host's activedescendant id. */
  readonly setActiveId: (id: string | null) => void;
  /** Forward a `(scrollToIndex)` request to the consumer's virtualizer. */
  readonly emitScrollToIndex: (idx: number) => void;
}

/**
 * Virtualization snapshot machinery for `ForCombobox`. Encapsulates three
 * pieces of state that together make typeahead, inline autocomplete, and
 * keyboard navigation work across a virtualized window where the active
 * option may be unmounted at any time:
 *
 * - **Cached options** — flat list of `{ id, value, label }` tuples that
 *   persists across listbox close / open cycles. Drives inline autocomplete
 *   and the `selected` label fallback.
 * - **Snapshot by position** — same data keyed by absolute `posInSet`, plus
 *   the `disabled` flag. Drives navigation past the rendered window so
 *   `moveIndex` knows about disabled boundaries it can't see.
 * - **Pending active position** — when navigation lands on a position outside
 *   the visible window the helper emits `(scrollToIndex)` and remembers the
 *   target here. The host's bridge effect calls `tryResolvePending` once the
 *   freshly-mounted option carries that posInSet so activedescendant seeds
 *   without a roundtrip through user code.
 *
 * The helper is internal — not re-exported from `combobox/index.ts` or
 * `public-api.ts`. Instantiate it once per host directive in its constructor.
 */
export class ComboboxSnapshot<T> {
  readonly #deps: ComboboxSnapshotDeps<T>;

  /**
   * Snapshot of the registered options as plain `{ id, value, label }`
   * tuples. Drives inline-autocomplete matching in the input directive and
   * the label-resolution fallback in `selected`.
   *
   * Persists across listbox close / open cycles: when the consumer's `@if`
   * unmounts the content (`items().length === 0`) the prior cache is
   * carried over so chips outside the listbox area and inline completion
   * after close keep resolving labels. Resets only when the consumer's
   * `totalCount` transitions — a query / source rebuild signal in the
   * virtualized case.
   *
   * The option's `label` is itself a `Signal<string>` so we never need to
   * peek at `textContent`; this used to be an `afterEveryRender`-driven
   * cache for exactly that reason but the post-render phase is unnecessary.
   */
  readonly #cachedOptions: Signal<readonly SnapshotEntry<T>[]>;

  /**
   * Snapshot keyed by absolute index (`posInSet`), persisted across unmount
   * so navigation can walk past the rendered window when virtualizing.
   *
   * Reset whenever the consumer's `totalCount` transitions — a query change
   * typically rebuilds the source array, so previously-folded entries no
   * longer point at the same items. On any other reactive trigger (option
   * mount / unmount) the prior map is carried over and the currently-
   * rendered options are overlaid in place.
   */
  readonly #snapshotByPos: Signal<Map<number, IndexedSnapshotEntry<T>>>;

  /**
   * When navigation lands on a posInSet outside the visible window, the
   * directive emits `(scrollToIndex)` and remembers the target here. The
   * host's bridge effect calls `tryResolvePending` to seed
   * `aria-activedescendant` once the option for that posInSet mounts.
   */
  readonly #pendingActivePos = signal<number | null>(null);

  constructor(deps: ComboboxSnapshotDeps<T>) {
    this.#deps = deps;

    this.#cachedOptions = linkedSignal<
      { total: number | undefined; items: readonly ForComboboxOptionHandle<T>[] },
      readonly SnapshotEntry<T>[]
    >({
      source: () => ({ total: deps.totalCount(), items: deps.items() }),
      computation: ({ total, items }, prev) => {
        // On a `totalCount` transition the `items()` array may still hold the
        // previous window — signal commits run serially, so the @for re-render
        // hasn't unregistered the old options yet. Skip folding on this
        // transition compute and start fresh; the next run (fired when items
        // catches up) folds the new window into a clean carry-over map.
        if (prev && prev.source.total !== total) {
          return [];
        }
        if (items.length === 0) {
          return prev?.value ?? [];
        }
        const merged = new Map<string, SnapshotEntry<T>>();
        for (const entry of prev?.value ?? []) {
          merged.set(entry.id, entry);
        }
        for (const item of items) {
          const id = item.id();
          merged.set(id, { id, value: item.value(), label: item.label() });
        }
        return [...merged.values()];
      },
    });

    this.#snapshotByPos = linkedSignal<
      { total: number | undefined; items: readonly ForComboboxOptionHandle<T>[] },
      Map<number, IndexedSnapshotEntry<T>>
    >({
      source: () => ({ total: deps.totalCount(), items: deps.items() }),
      computation: ({ total, items }, prev) => {
        // Same `items()`-still-stale handling as `#cachedOptions` above.
        if (prev && prev.source.total !== total) {
          return new Map();
        }
        const next = new Map<number, IndexedSnapshotEntry<T>>(prev?.value ?? []);
        for (const item of items) {
          const pos = item.posInSet?.() ?? null;
          if (pos === null) continue;
          next.set(pos, {
            id: item.id(),
            value: item.value(),
            label: item.label(),
            disabled: item.disabled(),
          });
        }
        return next;
      },
    });
  }

  /**
   * Pulls both caches so their `linkedSignal` `prev` slot gets seeded while
   * the listbox is open. Called from the host's bridge effect — without an
   * eager pull the lazy caches never run during the open cycle (no other
   * consumer pulls them in non-virtualized usage), and persistence across
   * close → re-open would start from an empty `prev`.
   */
  prime(): void {
    this.#cachedOptions();
    this.#snapshotByPos();
  }

  /**
   * Snapshot of the registered options as plain `{ id, value, label }`
   * tuples merged with any off-window entries known from the indexed
   * snapshot. Live entries take precedence (freshest data) — they appear
   * first, followed by indexed entries sorted by absolute position.
   *
   * Drives inline-autocomplete matching and the label-resolution fallback
   * in `ForCombobox.selected`.
   */
  cachedOptions(): readonly SnapshotEntry<T>[] {
    const live = this.#cachedOptions();
    if (this.#deps.totalCount() === undefined) {
      return live;
    }
    // Virtualized: merge in entries that previously rendered so typeahead
    // and inline autocomplete can match against options scrolled out of
    // view. The live entries take precedence (freshest data).
    const indexed = this.#snapshotByPos();
    if (indexed.size === 0) {
      return live;
    }
    const seen = new Set(live.map((o) => o.id));
    const merged: SnapshotEntry<T>[] = [...live];
    const positions = [...indexed.keys()].sort((a, b) => a - b);
    for (const pos of positions) {
      const entry = indexed.get(pos)!;
      if (seen.has(entry.id)) continue;
      merged.push({ id: entry.id, value: entry.value, label: entry.label });
    }
    return merged;
  }

  /**
   * Position-keyed snapshot for `ForCombobox.selected`'s scrolled-out-of-view
   * fallback. Read-only for callers — mutations belong to the helper.
   */
  snapshotByPos(): ReadonlyMap<number, IndexedSnapshotEntry<T>> {
    return this.#snapshotByPos();
  }

  /**
   * Try to resolve a pending virtualized navigation. Once an option carrying
   * the requested `posInSet` mounts, seeds activedescendant to its id and
   * scrolls it into view. Returns `true` if a pending request was resolved,
   * `false` otherwise — the host effect uses this to decide whether to fall
   * through to the auto-highlight branch.
   */
  tryResolvePending(): boolean {
    const pendingPos = this.#pendingActivePos();
    if (pendingPos === null) {
      return false;
    }
    const items = this.#deps.items();
    const match = items.find((it) => it.posInSet?.() === pendingPos);
    if (!match) {
      return false;
    }
    this.#deps.setActiveId(match.id());
    this.#pendingActivePos.set(null);
    match.host.scrollIntoView?.({ block: 'nearest' });
    return true;
  }

  /**
   * Auto-highlight the first or last enabled option that is **currently
   * rendered**, ordered by absolute `posInSet`. Used in the virtualized
   * branch of the host's auto-highlight effect — for non-virtualized lists
   * the host walks the live `items()` array directly. No-op if `totalCount`
   * is unset / zero or nothing is rendered.
   *
   * Deliberately *passive*: it only ever moves `aria-activedescendant`, never
   * the consumer's scroll position. Auto-highlight re-runs every time the
   * activedescendant is cleared, and scrolling the active option out of the
   * rendered window clears it (see `ForCombobox.unregisterOption`). If this
   * seed emitted `(scrollToIndex)` toward the absolute first option, every
   * wheel tick that unmounted the active row would snap the listbox straight
   * back to the top. Off-window targets are reached only through explicit
   * keyboard navigation (`navigateVirtualized`), which owns scroll-into-view.
   */
  seedFromIndexedSnapshot(direction: 'first' | 'last'): void {
    const total = this.#deps.totalCount();
    if (total === undefined || total <= 0) {
      return;
    }
    const items = this.#deps.items();
    if (items.length === 0) {
      return;
    }
    const ordered = [...items].sort((a, b) => {
      const pa = a.posInSet?.() ?? 0;
      const pb = b.posInSet?.() ?? 0;
      return direction === 'last' ? pb - pa : pa - pb;
    });
    for (const item of ordered) {
      if (!item.disabled()) {
        this.#deps.setActiveId(item.id());
        return;
      }
    }
  }

  /**
   * Virtualized arrow / Home / End navigation. Walks `moveIndex` against the
   * absolute total, using the indexed snapshot to learn about disabled
   * options outside the rendered window. When the target is in the visible
   * range and a live option is present, seeds activedescendant directly;
   * otherwise stashes the target in `#pendingActivePos` and emits
   * `(scrollToIndex)` so the consumer can scroll it into view.
   */
  navigateVirtualized(direction: 'next' | 'prev' | 'first' | 'last'): void {
    const total = this.#deps.totalCount();
    if (total === undefined || total <= 0) {
      return;
    }
    const indexed = this.#snapshotByPos();
    const items = this.#deps.items();

    // Locate current absolute position from the activedescendant.
    const currentId = this.#deps.getActiveId();
    let currentPos = -1;
    if (currentId !== null) {
      const live = items.find((o) => o.id() === currentId);
      const livePos = live?.posInSet?.() ?? null;
      if (livePos !== null) {
        currentPos = livePos;
      } else {
        for (const [pos, entry] of indexed) {
          if (entry.id === currentId) {
            currentPos = pos;
            break;
          }
        }
      }
    }

    let action = direction;
    if (currentPos < 0 && direction === 'next') {
      action = 'first';
    } else if (currentPos < 0 && direction === 'prev') {
      action = 'last';
    }

    // Disabled lookup against the indexed snapshot — entries we've never
    // seen are assumed enabled (the consumer filtered them in).
    const isDisabled = (i: number) => indexed.get(i)?.disabled === true;

    const next = moveIndex(currentPos, total, action, {
      loop: this.#deps.loop(),
      isDisabled,
    });
    if (next === null) {
      return;
    }

    const range = this.#deps.visibleRange();
    const inRange = !range || (next >= range[0] && next < range[1]);
    if (inRange) {
      const live = items.find((it) => it.posInSet?.() === next);
      if (live) {
        this.#pendingActivePos.set(null);
        this.#deps.setActiveId(live.id());
        live.host.scrollIntoView?.({ block: 'nearest' });
        return;
      }
      // Range claims it's in-window but the option hasn't mounted yet —
      // fall through to the pending path so the next render seeds it.
    }
    this.#pendingActivePos.set(next);
    this.#deps.emitScrollToIndex(next);
  }

  /**
   * Drop any pending virtualized navigation. Called by `closeMenu` so a
   * pending request from the previous open cycle doesn't seed
   * activedescendant after the listbox re-opens.
   */
  resetPending(): void {
    this.#pendingActivePos.set(null);
  }
}
