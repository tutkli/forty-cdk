import { linkedSignal, signal, type Signal } from '@angular/core';

import { moveIndex } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { ForTreeItemHandle } from './tree-context';

interface PositionEntry {
  readonly id: string;
  readonly disabled: boolean;
  readonly level: number;
  readonly expandable: boolean;
  readonly value: string;
}

/**
 * Dependencies for `TreeVirtualizedNavigator`. Wires the helper to the
 * host directive's signal graph and a small set of imperative callbacks.
 */
export interface TreeVirtualizedNavigatorDeps {
  /** Live registered tree items. */
  readonly items: Signal<readonly ForTreeItemHandle[]>;
  /** Total node count for the virtualized path. */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive range of currently rendered nodes when virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;
  /** Read the host's current activedescendant id. */
  readonly getActiveId: () => string | null;
  /** Write the host's activedescendant id. */
  readonly setActiveId: (id: string | null) => void;
  /** Forward a `(scrollToIndex)` request to the consumer's virtualizer. */
  readonly emitScrollToIndex: (idx: number) => void;
}

/**
 * Virtualization navigation engine for `ForTree`. Constructed lazily — only
 * once the consumer sets `totalCount()` — so a non-virtualized tree never
 * pulls this position-map machinery into its hot path. Encapsulates two pieces
 * of state that make keyboard navigation work across a virtualized window where
 * the active node may be unmounted at any time:
 *
 * - **Snapshot by position** — node data keyed by absolute `itemIndex`. Drives
 *   navigation past the rendered window so `moveIndex` knows about disabled
 *   boundaries it cannot see, and lets tree-specific moves (enter child /
 *   go-to-parent) resolve levels outside the window.
 * - **Pending active position** — when navigation lands outside the visible
 *   window, the helper emits `(scrollToIndex)` and remembers the target. The
 *   host's bridge effect calls `tryResolvePending` once the freshly-mounted
 *   node carries that `itemIndex`.
 *
 * Internal — not re-exported from `tree/index.ts` or `public-api.ts`.
 */
export class TreeVirtualizedNavigator {
  readonly #deps: TreeVirtualizedNavigatorDeps;

  readonly #snapshotByPos: Signal<Map<number, PositionEntry>>;

  readonly #pendingActivePos = signal<number | null>(null);

  constructor(deps: TreeVirtualizedNavigatorDeps) {
    this.#deps = deps;

    this.#snapshotByPos = linkedSignal<
      { total: number | undefined; items: readonly ForTreeItemHandle[] },
      Map<number, PositionEntry>
    >({
      source: () => ({ total: deps.totalCount(), items: deps.items() }),
      computation: (src, prev) => {
        const next =
          prev !== undefined && prev.source.total === src.total
            ? new Map(prev.value)
            : new Map<number, PositionEntry>();
        for (const item of src.items) {
          const pos = item.itemIndex();
          if (pos === null) continue;
          next.set(pos, {
            id: item.id(),
            disabled: item.disabled(),
            level: item.level(),
            expandable: item.expandable(),
            value: item.value(),
          });
        }
        return next;
      },
    });
  }

  /**
   * Pull the position-map so its `linkedSignal` `prev` slot gets seeded while
   * the tree nodes are tracked. Called from the host's bridge effect.
   */
  prime(): void {
    this.#snapshotByPos();
  }

  /**
   * Try to resolve a pending virtualized navigation. Once a node carrying
   * the requested `itemIndex` mounts, seeds activedescendant to its id and
   * scrolls it into view. Returns `true` if a pending request was resolved,
   * `false` otherwise.
   */
  tryResolvePending(): boolean {
    const pendingPos = this.#pendingActivePos();
    if (pendingPos === null) {
      return false;
    }
    const items = this.#deps.items();
    const match = items.find((it) => it.itemIndex() === pendingPos);
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
   * absolute total, using the indexed snapshot to learn about disabled nodes
   * outside the rendered window. When the target is in the visible range and a
   * live node is present, seeds activedescendant directly; otherwise stashes
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
      const livePos = live?.itemIndex() ?? null;
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
      loop: false,
      isDisabled,
    });
    if (next === null) {
      return;
    }

    const range = this.#deps.visibleRange();
    const inRange = !range || (next >= range[0] && next < range[1]);
    if (inRange) {
      const live = items.find((it) => it.itemIndex() === next);
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
   * Land the activedescendant on a specific absolute index. If the index is
   * inside the rendered window and live, seeds activedescendant directly;
   * otherwise stashes it as pending and emits `(scrollToIndex)`.
   */
  seedActive(index: number): void {
    const range = this.#deps.visibleRange();
    const items = this.#deps.items();
    const inRange = !range || (index >= range[0] && index < range[1]);
    if (inRange) {
      const live = items.find((it) => it.itemIndex() === index);
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

  /**
   * Resolve the active node's position entry from live items first, then the
   * snapshot. Returns `{ pos, value, level, expandable, disabled }` or `null`
   * when nothing is active.
   */
  currentEntry(): {
    pos: number;
    value: string;
    level: number;
    expandable: boolean;
    disabled: boolean;
  } | null {
    const currentId = this.#deps.getActiveId();
    if (currentId === null) {
      return null;
    }
    const items = this.#deps.items();
    const live = items.find((o) => o.id() === currentId);
    if (live) {
      const pos = live.itemIndex();
      if (pos !== null) {
        return {
          pos,
          value: live.value(),
          level: live.level(),
          expandable: live.expandable(),
          disabled: live.disabled(),
        };
      }
    }
    const indexed = this.#snapshotByPos();
    for (const [pos, entry] of indexed) {
      if (entry.id === currentId) {
        return {
          pos,
          value: entry.value,
          level: entry.level,
          expandable: entry.expandable,
          disabled: entry.disabled,
        };
      }
    }
    return null;
  }

  /**
   * Move activedescendant to the first child of the current node (the node
   * immediately after it in pre-order flat space). No-op when there is no
   * active node or when the active node is the last in the list.
   */
  enterChild(): void {
    const cur = this.currentEntry();
    if (!cur) return;
    const target = cur.pos + 1;
    const total = this.#deps.totalCount();
    if (total !== undefined && target < total) {
      this.seedActive(target);
    }
  }

  /**
   * Move activedescendant to the nearest preceding node at a shallower level
   * (the parent). No-op when the active node has no visible parent in the
   * snapshot — an accepted edge case when the parent has never been rendered.
   */
  moveToParent(): void {
    const cur = this.currentEntry();
    if (!cur) return;
    const indexed = this.#snapshotByPos();
    for (let p = cur.pos - 1; p >= 0; p--) {
      const e = indexed.get(p);
      if (e && e.level < cur.level) {
        this.seedActive(p);
        return;
      }
    }
  }
}
