import { type Signal } from '@angular/core';

import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type ListNavigationAction,
  moveIndex,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { VirtualizedNavigator } from '../_internal/virtualized-navigator/virtualized-navigator';
import type { ForTreeItemHandle, ForTreeVisibleNode } from './tree-context';

/**
 * The currently-focused node, resolved by the active {@link FocusModel}. Carries
 * the facts the tree's expand / collapse and parent / child moves need —
 * regardless of whether focus rides the DOM (roving) or an
 * `aria-activedescendant` pointer (virtualized).
 */
export interface TreeFocusEntry {
  /** Stable node value. */
  readonly value: string;
  /** Whether the node is an expandable parent. */
  readonly expandable: boolean;
  /** Effective disabled state. */
  readonly disabled: boolean;
}

/**
 * The seam that unifies the tree's two focus engines. `ForTree` selects one
 * implementation from `virtualized` once and routes every navigation intent
 * through it, so the keyboard handler resolves intent a single time and never
 * re-tests the mode. Two implementations:
 *
 * - {@link RovingFocusModel} — DOM focus rides the `treeitem` (APG Approach A).
 * - {@link ActiveDescendantFocusModel} — focus stays on the container and an
 *   `aria-activedescendant` pointer tracks the active node (virtualized path).
 */
export interface FocusModel {
  /** Move focus to a specific node. */
  focusTarget(handle: ForTreeItemHandle): void;
  /** Resolve the currently-focused node, or `null` when nothing is focused. */
  current(): TreeFocusEntry | null;
  /** Move focus to the next / previous / first / last enabled node. */
  navigate(action: ListNavigationAction): void;
  /** Move focus to the first child of the current node (an open parent). */
  enterChild(): void;
  /** Move focus to the current node's parent. */
  moveToParent(): void;
  /** Move focus to a typeahead match. */
  typeaheadTo(handle: ForTreeItemHandle): void;
}

/** Wiring for {@link RovingFocusModel}. */
export interface RovingFocusModelDeps {
  /** The shared roving-tabindex tracker driving the single tab stop. */
  readonly roving: RovingTabindex;
  /** Flattened visible nodes (each with its resolved parent host). */
  readonly visibleNodes: Signal<readonly ForTreeVisibleNode[]>;
  /** Visible node handles in flattened order. */
  readonly visibleHandles: Signal<readonly ForTreeItemHandle[]>;
  /**
   * Selection-follows-focus hook. Called with the destination value after a
   * `navigate` when single-mode selection should track focus; a no-op when the
   * tree is multi-select or the option is off.
   */
  readonly selectOnFocus: (value: string) => void;
}

/**
 * Focus engine for the standard (non-virtualized) tree: DOM focus rides the
 * `treeitem`, tracked through {@link RovingTabindex}. The current node is the
 * roving-active host; navigation walks the flattened visible-node list.
 *
 * Internal — not re-exported from `tree/index.ts` or `public-api.ts`.
 */
export class RovingFocusModel implements FocusModel {
  readonly #deps: RovingFocusModelDeps;

  constructor(deps: RovingFocusModelDeps) {
    this.#deps = deps;
  }

  focusTarget(handle: ForTreeItemHandle): void {
    this.#deps.roving.focusActive(handle.host);
  }

  current(): TreeFocusEntry | null {
    const entry = this.#currentNode();
    if (!entry) {
      return null;
    }
    const handle = entry.handle;
    return { value: handle.value(), expandable: handle.expandable(), disabled: handle.disabled() };
  }

  navigate(action: ListNavigationAction): void {
    const active = this.#deps.roving.active();
    const items = this.#deps.visibleHandles();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.host === active);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: false,
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    this.#deps.roving.focusActive(target.host);
    this.#deps.selectOnFocus(target.value());
  }

  enterChild(): void {
    const entry = this.#currentNode();
    if (!entry) {
      return;
    }
    const child = entry.handle.childContainer();
    const firstChild = child ? firstEnabledHost(child.items()) : null;
    if (firstChild) {
      this.#deps.roving.focusActive(firstChild);
    }
  }

  moveToParent(): void {
    const entry = this.#currentNode();
    if (entry?.parentHost) {
      this.#deps.roving.focusActive(entry.parentHost);
    }
  }

  typeaheadTo(handle: ForTreeItemHandle): void {
    this.#deps.roving.focusActive(handle.host);
  }

  #currentNode(): ForTreeVisibleNode | null {
    const active = this.#deps.roving.active();
    if (active === null) {
      return null;
    }
    return this.#deps.visibleNodes().find((entry) => entry.handle.host === active) ?? null;
  }
}

/** Position-snapshot entry carried by the tree's virtualized navigation engine. */
interface PositionEntry {
  readonly id: string;
  readonly disabled: boolean;
  readonly level: number;
  readonly expandable: boolean;
  readonly value: string;
}

/** Wiring for {@link ActiveDescendantFocusModel}. */
export interface ActiveDescendantFocusModelDeps {
  /** Live registered tree items — the rendered window when virtualizing. */
  readonly items: Signal<readonly ForTreeItemHandle[]>;
  /** Total node count for the virtualized path. */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive range of currently rendered nodes when virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;
  /** Read the host's current activedescendant id. */
  readonly getActiveId: () => string | null;
  /** Write the host's `aria-activedescendant` to a node id. */
  readonly setActiveId: (id: string | null) => void;
  /** Forward a `(scrollToIndex)` request to the consumer's virtualizer. */
  readonly emitScrollToIndex: (idx: number) => void;
}

/**
 * Focus engine for the virtualized tree: DOM focus stays on the container and
 * an `aria-activedescendant` pointer tracks the active node. Owns the shared
 * `_internal/virtualized-navigator` engine directly — a tree never wraps, so it
 * pins `loop` to `false`, and its snapshot entry carries `level` / `expandable`
 * / `value` so the tree-specific enter-child / go-to-parent moves can resolve
 * levels outside the rendered window. Selection never follows focus here.
 *
 * Internal — not re-exported from `tree/index.ts` or `public-api.ts`.
 */
export class ActiveDescendantFocusModel implements FocusModel {
  readonly #deps: ActiveDescendantFocusModelDeps;

  readonly #core: VirtualizedNavigator<ForTreeItemHandle, PositionEntry>;

  constructor(deps: ActiveDescendantFocusModelDeps) {
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

  focusTarget(handle: ForTreeItemHandle): void {
    this.#deps.setActiveId(handle.id());
  }

  current(): TreeFocusEntry | null {
    const cur = this.#currentEntry();
    if (!cur) {
      return null;
    }
    return { value: cur.value, expandable: cur.expandable, disabled: cur.disabled };
  }

  navigate(action: ListNavigationAction): void {
    this.#core.navigate(action);
  }

  /**
   * Move activedescendant to the first child of the current node (the node
   * immediately after it in pre-order flat space). No-op when there is no
   * active node or when the active node is the last in the list.
   */
  enterChild(): void {
    const cur = this.#currentEntry();
    if (!cur) return;
    const target = cur.pos + 1;
    const total = this.#deps.totalCount();
    if (total !== undefined && target < total) {
      this.#core.seedActive(target);
    }
  }

  /**
   * Move activedescendant to the nearest preceding node at a shallower level
   * (the parent). No-op when the active node has no visible parent in the
   * snapshot — an accepted edge case when the parent has never been rendered.
   */
  moveToParent(): void {
    const cur = this.#currentEntry();
    if (!cur) return;
    const indexed = this.#core.snapshotByPos();
    for (let p = cur.pos - 1; p >= 0; p--) {
      const e = indexed.get(p);
      if (e && e.level < cur.level) {
        this.#core.seedActive(p);
        return;
      }
    }
  }

  typeaheadTo(handle: ForTreeItemHandle): void {
    this.#deps.setActiveId(handle.id());
    handle.host.scrollIntoView?.({ block: 'nearest' });
  }

  /**
   * Resolve the active node's position entry from live items first, then the
   * snapshot. Returns `{ pos, value, level, expandable, disabled }` or `null`
   * when nothing is active.
   */
  #currentEntry(): {
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
}
