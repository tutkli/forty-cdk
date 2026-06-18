import { linkedSignal, signal, type Signal } from '@angular/core';

import { moveIndex } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { ForSelectOptionHandle } from './select-context';

interface PositionEntry<T> {
  readonly id: string;
  readonly value: T;
  readonly disabled: boolean;
}

/**
 * Dependencies for `SelectVirtualizedNavigator`. Wires the helper to the
 * root directive's signal graph and a small set of imperative callbacks.
 */
export interface SelectVirtualizedNavigatorDeps<T> {
  /** Live registered options. */
  readonly items: Signal<readonly ForSelectOptionHandle<T>[]>;
  /** Total option count for the virtualized path. */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive range of currently rendered options when virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;
  /** Whether keyboard navigation wraps at the ends. */
  readonly loop: Signal<boolean>;
  /** Read the root's current activedescendant id. */
  readonly getActiveId: () => string | null;
  /** Write the root's activedescendant id. */
  readonly setActiveId: (id: string | null) => void;
  /** Forward a `(scrollToIndex)` request to the consumer's virtualizer. */
  readonly emitScrollToIndex: (idx: number) => void;
}

/**
 * Virtualization navigation engine for `ForSelect`. Constructed lazily — only
 * once the consumer sets `totalCount()` — so a non-virtualized select never
 * pulls this position-map machinery into its hot path. Encapsulates two pieces
 * of state that make keyboard navigation work across a virtualized window where
 * the active option may be unmounted at any time:
 *
 * - **Snapshot by position** — option data (id, value, disabled) keyed by
 *   absolute `posInSet`. Drives navigation past the rendered window so
 *   `moveIndex` knows about disabled boundaries it cannot see, and lets the
 *   root resolve the committed option's index on open.
 * - **Pending active position** — when navigation lands outside the visible
 *   window, the helper emits `(scrollToIndex)` and remembers the target. The
 *   root's bridge effect calls `tryResolvePending` once the freshly-mounted
 *   option carries that `posInSet`.
 *
 * Internal — not re-exported from `select/index.ts` or `public-api.ts`.
 */
export class SelectVirtualizedNavigator<T> {
  readonly #deps: SelectVirtualizedNavigatorDeps<T>;

  readonly #snapshotByPos: Signal<Map<number, PositionEntry<T>>>;

  readonly #pendingActivePos = signal<number | null>(null);

  constructor(deps: SelectVirtualizedNavigatorDeps<T>) {
    this.#deps = deps;

    this.#snapshotByPos = linkedSignal<
      { total: number | undefined; items: readonly ForSelectOptionHandle<T>[] },
      Map<number, PositionEntry<T>>
    >({
      source: () => ({ total: deps.totalCount(), items: deps.items() }),
      computation: (src, prev) => {
        const next =
          prev !== undefined && prev.source.total === src.total
            ? new Map(prev.value)
            : new Map<number, PositionEntry<T>>();
        for (const item of src.items) {
          const pos = item.posInSet();
          if (pos === null) continue;
          let value: T;
          try {
            value = item.value();
          } catch (e) {
            const code = (e as Error & { code?: unknown }).code;
            if (typeof code === 'number' && Math.abs(code) === 950) continue;
            throw e;
          }
          next.set(pos, { id: item.id(), value, disabled: item.disabled() });
        }
        return next;
      },
    });
  }

  /**
   * Pull the position-map so its `linkedSignal` `prev` slot gets seeded while
   * the select options are tracked. Called from the root's bridge effect.
   */
  prime(): void {
    this.#snapshotByPos();
  }

  /**
   * Try to resolve a pending virtualized navigation. Once an option carrying
   * the requested `posInSet` mounts, seeds activedescendant to its id and
   * scrolls it into view. Returns `true` if a pending request was resolved,
   * `false` otherwise.
   */
  tryResolvePending(): boolean {
    const pendingPos = this.#pendingActivePos();
    if (pendingPos === null) {
      return false;
    }
    const items = this.#deps.items();
    const match = items.find((it) => it.posInSet() === pendingPos);
    if (!match) {
      return false;
    }
    this.#deps.setActiveId(match.id());
    this.#pendingActivePos.set(null);
    match.host.scrollIntoView?.({ block: 'nearest' });
    return true;
  }

  /**
   * Virtualized arrow / Home / End navigation. Walks `moveIndex` against the
   * absolute total, using the indexed snapshot to learn about disabled options
   * outside the rendered window. When the target is in the visible range and a
   * live option is present, seeds activedescendant directly; otherwise stashes
   * the target in `#pendingActivePos` and emits `(scrollToIndex)`.
   */
  navigate(direction: 'next' | 'prev' | 'first' | 'last'): void {
    const total = this.#deps.totalCount();
    if (total === undefined || total <= 0) {
      return;
    }
    const indexed = this.#snapshotByPos();
    const items = this.#deps.items();

    const currentId = this.#deps.getActiveId();
    let currentPos = -1;
    if (currentId !== null) {
      const live = items.find((o) => o.id() === currentId);
      const livePos = live?.posInSet() ?? null;
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
      const live = items.find((it) => it.posInSet() === next);
      if (live) {
        this.#pendingActivePos.set(null);
        this.#deps.setActiveId(live.id());
        live.host.scrollIntoView?.({ block: 'nearest' });
        return;
      }
    }
    this.#pendingActivePos.set(next);
    this.#deps.emitScrollToIndex(next);
  }

  /**
   * Read-only position snapshot for the root's committed-index resolution.
   * Keyed by absolute `posInSet`; persists across close→reopen while
   * `totalCount` is unchanged.
   */
  snapshotByPos(): ReadonlyMap<number, PositionEntry<T>> {
    return this.#snapshotByPos();
  }

  /**
   * Land the activedescendant on a specific absolute index (the committed
   * option on open, or a first/last fallback). If the index is inside the
   * rendered window and live, seeds activedescendant directly; otherwise
   * stashes it as pending and emits `(scrollToIndex)` so the consumer's
   * virtualizer mounts it.
   */
  seedActive(index: number): void {
    const range = this.#deps.visibleRange();
    const items = this.#deps.items();
    const inRange = !range || (index >= range[0] && index < range[1]);
    if (inRange) {
      const live = items.find((it) => it.posInSet() === index);
      if (live) {
        this.#pendingActivePos.set(null);
        this.#deps.setActiveId(live.id());
        live.host.scrollIntoView?.({ block: 'nearest' });
        return;
      }
    }
    this.#pendingActivePos.set(index);
    this.#deps.emitScrollToIndex(index);
  }

  /** Clear any pending navigation (called by the root on close). */
  resetPending(): void {
    this.#pendingActivePos.set(null);
  }
}
