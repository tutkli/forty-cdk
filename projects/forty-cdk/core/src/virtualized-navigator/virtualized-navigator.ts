import { computed, signal, type Signal, untracked } from '@angular/core';

import { foldSnapshotOnTotalCountTransition } from '../collection/fold-snapshot';
import { type ListNavigationAction, moveIndex } from '../keyboard-navigation/keyboard-navigation';

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
   * this fold. The single NG0950 read guard (`tryReadHandle`) is injected
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
  /**
   * Optional monotonic "the dataset changed" signal. When provided and its
   * value changes between folds, the position snapshot rebuilds from empty —
   * exactly as a `totalCount` transition does — discarding carried-over
   * off-window entries. This is the consumer-facing counterpart to
   * {@link VirtualizedNavigator.invalidateSnapshot}: wire a signal that bumps on
   * a same-length dataset refresh (a re-sort / reload that keeps `totalCount`
   * unchanged) so navigation never resolves against a stale off-window entry.
   */
  readonly dataVersion?: Signal<unknown>;
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
 *   transition, which restarts from an empty map. A same-length dataset refresh
 *   (invisible to the `totalCount` diff) can force the same reset through
 *   {@link invalidateSnapshot} or the optional `deps.dataVersion` signal.
 * - **Pending active position** — when navigation lands outside the visible
 *   window, the engine emits `(scrollToIndex)` and remembers the target. The
 *   adapter's bridge effect calls `tryResolvePending` once the freshly-mounted
 *   item carries that position.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 *
 * @typeParam H Primitive handle type (option / node).
 * @typeParam E Position-snapshot entry; widens {@link VirtualizedNavigatorEntry}.
 */
export class VirtualizedNavigator<H, E extends VirtualizedNavigatorEntry> {
  readonly #deps: VirtualizedNavigatorDeps<H>;

  readonly #accessors: VirtualizedNavigatorAccessors<H, E>;

  readonly #snapshotByPos: Signal<Map<number, E>>;

  /**
   * Monotonic counter bumped by {@link invalidateSnapshot}. The snapshot fold
   * tracks it as a `dataVersion` alongside the consumer's own optional
   * `deps.dataVersion`, so an imperative call forces a from-empty rebuild on the
   * next fold even when `totalCount` is unchanged.
   */
  readonly #invalidationVersion = signal(0);

  /**
   * The pending navigation slot. Carries the requested absolute position, the
   * action that produced it, and whether a resolve landing on a disabled entry
   * should continue the walk. Directional navigation (`navigate` / `#moveFrom`)
   * sets `continueOnDisabled`, so it never settles activedescendant on a
   * disabled id; a directionless `seedActive` (committed-index / enter-child /
   * parent move — all targeting enabled positions in practice) settles on the
   * resolved item as before.
   */
  readonly #pendingActivePos = signal<{
    pos: number;
    action: ListNavigationAction;
    continueOnDisabled: boolean;
  } | null>(null);

  constructor(
    deps: VirtualizedNavigatorDeps<H>,
    accessors: VirtualizedNavigatorAccessors<H, E>,
    options: VirtualizedNavigatorOptions = {},
  ) {
    this.#deps = deps;
    this.#accessors = accessors;

    const consumerVersion = deps.dataVersion;
    const version = computed(
      () => ({
        invalidation: this.#invalidationVersion(),
        consumer: consumerVersion ? consumerVersion() : undefined,
      }),
      { equal: (a, b) => a.invalidation === b.invalidation && a.consumer === b.consumer },
    );

    this.#snapshotByPos = foldSnapshotOnTotalCountTransition<H, Map<number, E>>(
      deps.items,
      deps.totalCount,
      () => new Map<number, E>(),
      (prev, window) => {
        const next = new Map(prev);
        for (const item of window) {
          const pos = accessors.posOf(item);
          if (pos === null) continue;
          const entry = accessors.readEntry(item);
          if (entry === null) continue;
          next.set(pos, entry);
        }
        return next;
      },
      {
        deferOnTotalTransition: options.deferFoldOnTotalTransition === true,
        dataVersion: version,
      },
    );
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
   * Force the position snapshot to rebuild from empty on the next fold,
   * discarding every carried-over off-window entry. Call this after a
   * same-length dataset refresh — a re-sort / reload that keeps `totalCount`
   * unchanged — so navigation never resolves against a stale `id` / `disabled` /
   * `value` for a position outside the current `items()` window. Positions not
   * in the current window are gone after the rebuild; the current window folds
   * in as usual on the next `prime()`. The `deps.dataVersion` signal is the
   * reactive counterpart when the consumer already models "the dataset changed".
   */
  invalidateSnapshot(): void {
    this.#invalidationVersion.update((v) => v + 1);
  }

  /**
   * Try to resolve a pending virtualized navigation. Once an item carrying the
   * requested position mounts, seeds activedescendant to its id and scrolls it
   * into view. If the freshly-mounted entry turns out to be disabled, the walk
   * continues from that position in the pending direction rather than settling
   * activedescendant on a disabled id. Returns `true` if a pending request was
   * resolved (or continued), `false` otherwise.
   *
   * Called from the adapter's bridge effect, whose documented reactive trigger
   * is `items()`. The pending slot is read **untracked**: this method writes it
   * back to `null` on a successful resolve, and tracking the read would make
   * that write re-invalidate the calling effect — a self-invalidation that
   * double-runs the prime / fold pass in every consuming primitive.
   */
  tryResolvePending(): boolean {
    const pending = untracked(this.#pendingActivePos);
    if (pending === null) {
      return false;
    }
    const match = this.#deps.items().find((it) => this.#accessors.posOf(it) === pending.pos);
    if (!match) {
      return false;
    }
    if (pending.continueOnDisabled && this.#accessors.readEntry(match)?.disabled === true) {
      this.#pendingActivePos.set(null);
      this.#moveFrom(pending.pos, this.#continuationDirection(pending.action));
      return true;
    }
    this.#deps.setActiveId(this.#accessors.idOf(match));
    this.#pendingActivePos.set(null);
    this.#scrollIntoView(this.#accessors.hostOf(match));
    return true;
  }

  /**
   * Virtualized arrow / Home / End navigation. Resolves the current absolute
   * position from the active id (live item, else the snapshot) or the resume
   * position, then delegates the `moveIndex` walk to {@link #moveFrom}.
   *
   * Resolving the current position when the active item is unmounted (scrolled
   * off the rendered window) is an **O(total)** linear scan of the position
   * snapshot: the active id is matched against every snapshot entry. This is
   * deliberate and acceptable -- the scan runs only on that off-window branch
   * (an active item still in the rendered window resolves in O(window) via
   * `items`) and only once per keypress. The escape hatch, should profiling
   * ever flag it at very large datasets (10k+ entries), is a companion
   * `id -> position` map maintained alongside `#snapshotByPos` to make the
   * lookup O(1); it is intentionally not built today because inverting the
   * snapshot on every fold would trade this rare per-keypress cost for an
   * O(total) rebuild on every scroll tick.
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

    this.#moveFrom(currentPos, action);
  }

  /**
   * Land the activedescendant on a specific absolute index (the committed item
   * on open, an enter-child / parent move, or a first / last fallback). If the
   * index is inside the rendered window and live, seeds activedescendant
   * directly; otherwise stashes it as pending and emits `(scrollToIndex)` so the
   * consumer's virtualizer mounts it. A seed has no inherent direction, so its
   * pending resolve settles on the resolved item even if disabled (callers
   * target enabled positions) rather than continuing a directional walk.
   */
  seedActive(index: number): void {
    if (this.#seedIfRendered(index)) {
      return;
    }
    this.#pendingActivePos.set({ pos: index, action: 'next', continueOnDisabled: false });
    this.#deps.emitScrollToIndex(index);
  }

  /** Clear any pending navigation (called by the adapter on close). */
  resetPending(): void {
    this.#pendingActivePos.set(null);
  }

  /**
   * Walk `moveIndex` from `fromPos` in `action`, using the indexed snapshot to
   * skip disabled items outside the rendered window. Seeds activedescendant when
   * the target is rendered; otherwise stashes it (with the action, so a
   * resolve-on-disabled can continue the walk) and emits `(scrollToIndex)`.
   */
  #moveFrom(fromPos: number, action: ListNavigationAction): void {
    const total = this.#deps.totalCount();
    if (total === undefined || total <= 0) {
      return;
    }
    const indexed = this.#snapshotByPos();
    const next = moveIndex(fromPos, total, action, {
      loop: this.#deps.loop(),
      isDisabled: (i) => indexed.get(i)?.disabled === true,
    });
    if (next === null) {
      return;
    }
    if (this.#seedIfRendered(next)) {
      return;
    }
    this.#pendingActivePos.set({ pos: next, action, continueOnDisabled: true });
    this.#deps.emitScrollToIndex(next);
  }

  #continuationDirection(action: ListNavigationAction): ListNavigationAction {
    return action === 'prev' || action === 'last' ? 'prev' : 'next';
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
