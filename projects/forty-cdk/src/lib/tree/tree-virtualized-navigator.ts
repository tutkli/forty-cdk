import { type Signal } from '@angular/core';

import { VirtualizedNavigator } from '../_internal/virtualized-navigator/virtualized-navigator';
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
 * Virtualization navigation engine for `ForTree`. A thin adapter over the
 * shared `_internal/virtualized-navigator` engine. A tree never wraps, so it
 * pins `loop` to `false`; its snapshot entry carries `level` / `expandable` /
 * `value` so the tree-specific moves (enter child / go-to-parent) can resolve
 * levels outside the rendered window.
 *
 * Internal — not re-exported from `tree/index.ts` or `public-api.ts`.
 */
export class TreeVirtualizedNavigator {
  readonly #deps: TreeVirtualizedNavigatorDeps;

  readonly #core: VirtualizedNavigator<ForTreeItemHandle, PositionEntry>;

  constructor(deps: TreeVirtualizedNavigatorDeps) {
    this.#deps = deps;
    this.#core = new VirtualizedNavigator(
      { ...deps, loop: () => false },
      {
        posOf: (n) => n.itemIndex(),
        idOf: (n) => n.id(),
        hostOf: (n) => n.host,
        readEntry: (n) => ({
          id: n.id(),
          disabled: n.disabled(),
          level: n.level(),
          expandable: n.expandable(),
          value: n.value(),
        }),
      },
    );
  }

  /** @see VirtualizedNavigator.prime */
  prime(): void {
    this.#core.prime();
  }

  /** @see VirtualizedNavigator.tryResolvePending */
  tryResolvePending(): boolean {
    return this.#core.tryResolvePending();
  }

  /** @see VirtualizedNavigator.navigate */
  navigate(direction: 'next' | 'prev' | 'first' | 'last'): void {
    this.#core.navigate(direction);
  }

  /** @see VirtualizedNavigator.seedActive */
  seedActive(index: number): void {
    this.#core.seedActive(index);
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
    const live = this.#deps.items().find((o) => o.id() === currentId);
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
    const indexed = this.#core.snapshotByPos();
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
    const indexed = this.#core.snapshotByPos();
    for (let p = cur.pos - 1; p >= 0; p--) {
      const e = indexed.get(p);
      if (e && e.level < cur.level) {
        this.seedActive(p);
        return;
      }
    }
  }
}
