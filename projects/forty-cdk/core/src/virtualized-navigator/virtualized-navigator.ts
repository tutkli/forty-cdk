import { linkedSignal, signal, type Signal } from '@angular/core';

import { type ListNavigationAction, moveIndex } from '../keyboard-navigation/keyboard-navigation';

/**
 * Re-export of the shared NG0950 read guard under the navigator's historical
 * name. The single source lives in `_internal/signal-graph/read-handle.ts`;
 * adapters wiring `readEntry` keep importing it from here.
 */
export { tryReadHandle as readEntryGuarded } from '../signal-graph/read-handle';

/**
 * Minimal shape every position-snapshot entry must expose so the engine can
 * resolve the current absolute position from `aria-activedescendant` and skip
 * disabled positions outside the rendered window. Primitive adapters widen this
 * with their own per-entry fields (value, label, level, …).
 */
export interface VirtualizedNavigatorEntry {
  /** Stable host id — the activedescendant target. */
  readonly id: string;
  /** Whether the position is disabled, so `moveIndex` skips over it. */
  readonly disabled: boolean;
}

/**
 * Handle-shape adapters. Each primitive's option / node handle exposes its
 * absolute position, id, and host element under different accessor names; these
 * bridge the engine to whichever shape the primitive uses, so the navigation
 * algorithm itself stays handle-agnostic.
 */
export interface VirtualizedNavigatorAccessors<H, E extends VirtualizedNavigatorEntry> {
  /** Absolute position of a live handle, or `null` before it is assigned. */
  readonly posOf: (item: H) => number | null;
  /** Stable id of a live handle. */
  readonly idOf: (item: H) => string;
  /** Host element of a live handle, scrolled into view when it becomes active. */
  readonly hostOf: (item: H) => HTMLElement;
  /**
   * Build the position-snapshot entry for a live handle, or `null` to skip it
   * this fold. The single NG0950 read guard (`readEntryGuarded`) is injected
   * here: a statically-rendered option that registers before its
   * `input.required` binding is written returns `null` and is folded in on the
   * binding's re-run.
   */
  readonly readEntry: (item: H) => E | null;
  /**
   * Scroll the active host into view. Defaults to
   * `host.scrollIntoView?.({ block: 'nearest' })`; the combobox overrides it to
   * open its pointer-suppression window first.
   */
  readonly scrollIntoView?: (host: HTMLElement) => void;
}

/** Tunables for the position-snapshot fold. */
export interface VirtualizedNavigatorOptions {
  /**
   * Behaviour on a `totalCount` transition. `false` (default) restarts from an
   * empty map **and folds the current window in the same compute** (Select /
   * Listbox / Tree). `true` returns the empty map **without folding**, deferring
   * to the next run once `items` catches up — the stale-window invariant the
   * Combobox needs, because a `totalCount` flip (a query / source rebuild) can
   * fire while `items()` still holds the previous window.
   */
  readonly deferFoldOnTotalTransition?: boolean;
}

/**
 * Signal-graph wiring. The root directive owns the activedescendant and the
 * virtualizer bridge, so the engine reads / writes them through callbacks
 * instead of holding its own copies.
 */
export interface VirtualizedNavigatorDeps<H> {
  /** Live registered handles — the rendered window when virtualizing. */
  readonly items: Signal<readonly H[]>;
  /** Total handle count for the virtualized path. */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive range of currently rendered handles when virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;
  /** Whether keyboard navigation wraps at the ends. */
  readonly loop: () => boolean;
  /** Read the root's current activedescendant id. */
  readonly getActiveId: () => string | null;
  /** Write the root's activedescendant id. */
  readonly setActiveId: (id: string | null) => void;
  /** Forward a `(scrollToIndex)` request to the consumer's virtualizer. */
  readonly emitScrollToIndex: (idx: number) => void;
  /**
   * Optional resume position, consulted only when there is no active id. Lets a
   * primitive that clears its dangling `aria-activedescendant` on unmount (a
   * removed element is an invalid target) still resume navigation from the last
   * active absolute position instead of restarting at the edge. Returns `null`
   * when there is nothing to resume from.
   */
  readonly getResumePos?: () => number | null;
}

/**
 * The single activedescendant-over-absolute-index navigation engine shared by
 * every virtualized collection primitive (Select, Listbox, Combobox, Tree).
 * Constructed lazily by each primitive's thin adapter — only once the consumer
 * sets `totalCount()` — so a non-virtualized collection never pulls this
 * position-map machinery into its hot path. Encapsulates two pieces of state
 * that make keyboard navigation work across a virtualized window where the
 * active item may be unmounted at any time:
 *
 * - **Snapshot by position** — entry data keyed by absolute position. Drives
 *   navigation past the rendered window so `moveIndex` knows about disabled
 *   boundaries it cannot see, and lets adapters resolve off-window entries
 *   (committed-index resolution, level-aware tree moves, label fallbacks). The
 *   prior map is carried over on every reactive trigger except a `totalCount`
 *   transition, which restarts from an empty map.
 * - **Pending active position** — when navigation lands outside the visible
 *   window, the engine emits `(scrollToIndex)` and remembers the target. The
 *   adapter's bridge effect calls `tryResolvePending` once the freshly-mounted
 *   item carries that position.
 *
 * Internal — lives in `_internal/`, never re-exported from `public-api.ts`.
 *
 * @typeParam H Primitive handle type (option / node).
 * @typeParam E Position-snapshot entry; widens {@link VirtualizedNavigatorEntry}.
 */
export class VirtualizedNavigator<H, E extends VirtualizedNavigatorEntry> {
  readonly #deps: VirtualizedNavigatorDeps<H>;

  readonly #accessors: VirtualizedNavigatorAccessors<H, E>;

  readonly #snapshotByPos: Signal<Map<number, E>>;

  readonly #pendingActivePos = signal<number | null>(null);

  constructor(
    deps: VirtualizedNavigatorDeps<H>,
    accessors: VirtualizedNavigatorAccessors<H, E>,
    options: VirtualizedNavigatorOptions = {},
  ) {
    this.#deps = deps;
    this.#accessors = accessors;

    const deferFold = options.deferFoldOnTotalTransition === true;

    this.#snapshotByPos = linkedSignal<
      { total: number | undefined; items: readonly H[] },
      Map<number, E>
    >({
      source: () => ({ total: deps.totalCount(), items: deps.items() }),
      computation: (src, prev) => {
        const totalChanged = prev !== undefined && prev.source.total !== src.total;
        if (deferFold && totalChanged) {
          return new Map<number, E>();
        }
        const next =
          totalChanged || prev === undefined ? new Map<number, E>() : new Map(prev.value);
        for (const item of src.items) {
          const pos = accessors.posOf(item);
          if (pos === null) continue;
          const entry = accessors.readEntry(item);
          if (entry === null) continue;
          next.set(pos, entry);
        }
        return next;
      },
    });
  }

  /**
   * Pull the position-map so its `linkedSignal` `prev` slot gets seeded while
   * the items are tracked. Called from the adapter's bridge effect.
   */
  prime(): void {
    this.#snapshotByPos();
  }

  /**
   * Read-only position snapshot, keyed by absolute position. Persists across
   * close → reopen while `totalCount` is unchanged. Adapters read it for
   * committed-index resolution, level-aware moves, and off-window label
   * fallbacks.
   */
  snapshotByPos(): ReadonlyMap<number, E> {
    return this.#snapshotByPos();
  }

  /**
   * Try to resolve a pending virtualized navigation. Once an item carrying the
   * requested position mounts, seeds activedescendant to its id and scrolls it
   * into view. Returns `true` if a pending request was resolved, `false`
   * otherwise.
   */
  tryResolvePending(): boolean {
    const pendingPos = this.#pendingActivePos();
    if (pendingPos === null) {
      return false;
    }
    const match = this.#deps.items().find((it) => this.#accessors.posOf(it) === pendingPos);
    if (!match) {
      return false;
    }
    this.#deps.setActiveId(this.#accessors.idOf(match));
    this.#pendingActivePos.set(null);
    this.#scrollIntoView(this.#accessors.hostOf(match));
    return true;
  }

  /**
   * Virtualized arrow / Home / End navigation. Walks `moveIndex` against the
   * absolute total, using the indexed snapshot to learn about disabled items
   * outside the rendered window. When the target is in the visible range and a
   * live item is present, seeds activedescendant directly; otherwise stashes the
   * target in the pending slot and emits `(scrollToIndex)`.
   */
  navigate(direction: ListNavigationAction): void {
    const total = this.#deps.totalCount();
    if (total === undefined || total <= 0) {
      return;
    }
    const indexed = this.#snapshotByPos();
    const items = this.#deps.items();

    const currentId = this.#deps.getActiveId();
    let currentPos = -1;
    if (currentId !== null) {
      const live = items.find((o) => this.#accessors.idOf(o) === currentId);
      const livePos = live ? this.#accessors.posOf(live) : null;
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
    } else {
      const resume = this.#deps.getResumePos?.();
      if (resume !== undefined && resume !== null && resume >= 0 && resume < total) {
        currentPos = resume;
      }
    }

    let action = direction;
    if (currentPos < 0 && direction === 'next') {
      action = 'first';
    } else if (currentPos < 0 && direction === 'prev') {
      action = 'last';
    }

    const isDisabled = (i: number) => indexed.get(i)?.disabled === true;

    const next = moveIndex(currentPos, total, action, {
      loop: this.#deps.loop(),
      isDisabled,
    });
    if (next === null) {
      return;
    }

    if (this.#seedIfRendered(next)) {
      return;
    }
    this.#pendingActivePos.set(next);
    this.#deps.emitScrollToIndex(next);
  }

  /**
   * Land the activedescendant on a specific absolute index (the committed item
   * on open, an enter-child / parent move, or a first / last fallback). If the
   * index is inside the rendered window and live, seeds activedescendant
   * directly; otherwise stashes it as pending and emits `(scrollToIndex)` so the
   * consumer's virtualizer mounts it.
   */
  seedActive(index: number): void {
    if (this.#seedIfRendered(index)) {
      return;
    }
    this.#pendingActivePos.set(index);
    this.#deps.emitScrollToIndex(index);
  }

  /** Clear any pending navigation (called by the adapter on close). */
  resetPending(): void {
    this.#pendingActivePos.set(null);
  }

  #seedIfRendered(index: number): boolean {
    const range = this.#deps.visibleRange();
    const inRange = !range || (index >= range[0] && index < range[1]);
    if (inRange) {
      const live = this.#deps.items().find((it) => this.#accessors.posOf(it) === index);
      if (live) {
        this.#pendingActivePos.set(null);
        this.#deps.setActiveId(this.#accessors.idOf(live));
        this.#scrollIntoView(this.#accessors.hostOf(live));
        return true;
      }
    }
    return false;
  }

  #scrollIntoView(host: HTMLElement): void {
    if (this.#accessors.scrollIntoView) {
      this.#accessors.scrollIntoView(host);
      return;
    }
    host.scrollIntoView?.({ block: 'nearest' });
  }
}
