import { type Signal } from '@angular/core';

import {
  firstEnabledHost,
  isUnset,
  type ListNavigationAction,
  moveIndex,
  type RovingTabindex,
  VirtualizedNavigator,
  type VirtualizedNavigatorDeps,
} from 'forty-cdk/core';
import type { ForTreeItemHandle, ForTreeVisibleNode } from './tree-context';

/**
 * The currently-focused node, resolved by the active {@link FocusModel}. Carries
 * the facts the tree's expand / collapse and parent / child moves need —
 * regardless of whether focus rides the DOM (roving) or an
 * `aria-activedescendant` pointer (virtualized).
 */
export interface TreeFocusEntry<T = unknown> {
  /** Stable node value. */
  readonly value: T;
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
export interface FocusModel<T = unknown> {
  /** Move focus to a specific node. */
  focusTarget(handle: ForTreeItemHandle<T>): void;
  /** Resolve the currently-focused node, or `null` when nothing is focused. */
  current(): TreeFocusEntry<T> | null;
  /** Move focus to the next / previous / first / last enabled node. */
  navigate(action: ListNavigationAction): void;
  /** Move focus to the first child of the current node (an open parent). */
  enterChild(): void;
  /** Move focus to the current node's parent. */
  moveToParent(): void;
  /** Move focus to a typeahead match. */
  typeaheadTo(handle: ForTreeItemHandle<T>): void;
}

/** Wiring for {@link RovingFocusModel}. */
export interface RovingFocusModelDeps<T = unknown> {
  /** The shared roving-tabindex tracker driving the single tab stop. */
  readonly roving: RovingTabindex;
  /** Flattened visible nodes (each with its resolved parent host). */
  readonly visibleNodes: Signal<readonly ForTreeVisibleNode<T>[]>;
  /** Visible node handles in flattened order. */
  readonly visibleHandles: Signal<readonly ForTreeItemHandle<T>[]>;
  /**
   * Selection-follows-focus hook. Called with the destination value after a
   * `navigate` when single-mode selection should track focus; a no-op when the
   * tree is multi-select or the option is off.
   */
  readonly selectOnFocus: (value: T) => void;
}

/**
 * Focus engine for the standard (non-virtualized) tree: DOM focus rides the
 * `treeitem`, tracked through {@link RovingTabindex}. The current node is the
 * roving-active host; navigation walks the flattened visible-node list.
 *
 * Internal — not re-exported from `tree/index.ts` or `public-api.ts`.
 */
export class RovingFocusModel<T = unknown> implements FocusModel<T> {
  readonly #deps: RovingFocusModelDeps<T>;

  constructor(deps: RovingFocusModelDeps<T>) {
    this.#deps = deps;
  }

  focusTarget(handle: ForTreeItemHandle<T>): void {
    this.#deps.roving.focusActive(handle.host);
  }

  current(): TreeFocusEntry<T> | null {
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

  typeaheadTo(handle: ForTreeItemHandle<T>): void {
    this.#deps.roving.focusActive(handle.host);
  }

  #currentNode(): ForTreeVisibleNode<T> | null {
    const active = this.#deps.roving.active();
    if (active === null) {
      return null;
    }
    return this.#deps.visibleNodes().find((entry) => entry.handle.host === active) ?? null;
  }
}

/** Position-snapshot entry carried by the tree's virtualized navigation engine. */
interface PositionEntry<T> {
  readonly id: string;
  readonly disabled: boolean;
  readonly level: number;
  readonly expandable: boolean;
  readonly value: T;
}

/**
 * Wiring for {@link ActiveDescendantFocusModel} — the shared engine's own
 * dependencies, minus `loop` (a tree never wraps, so the model pins it to
 * `false`) and with `getResumePos` mandatory rather than optional, because the
 * tree clears its dangling activedescendant on unmount and always resumes from
 * the retained position.
 */
export type ActiveDescendantFocusModelDeps<T = unknown> = Omit<
  VirtualizedNavigatorDeps<ForTreeItemHandle<T>>,
  'loop' | 'getResumePos'
> & {
  /**
   * Last active absolute position, retained when the active node unmounts so
   * navigation resumes from it instead of restarting at the edge. Returns `null`
   * when there is nothing to resume from.
   */
  readonly getResumePos: () => number | null;
};

/**
 * Focus engine for the virtualized tree: DOM focus stays on the container and
 * an `aria-activedescendant` pointer tracks the active node. Owns the shared
 * `forty-cdk/core` navigation engine directly — a tree never wraps, so it pins
 * `loop` to `false`, and its snapshot entry carries `level` / `expandable`
 * / `value` so the tree-specific enter-child / go-to-parent moves can resolve
 * levels outside the rendered window. Selection never follows focus here.
 *
 * Internal — not re-exported from `tree/index.ts` or `public-api.ts`.
 */
export class ActiveDescendantFocusModel<T = unknown> implements FocusModel<T> {
  readonly #deps: ActiveDescendantFocusModelDeps<T>;

  readonly #core: VirtualizedNavigator<ForTreeItemHandle<T>, PositionEntry<T>>;

  constructor(deps: ActiveDescendantFocusModelDeps<T>) {
    this.#deps = deps;
    this.#core = new VirtualizedNavigator(
      { ...deps, loop: () => false },
      {
        posOf: (n) => n.itemIndex(),
        idOf: (n) => n.id(),
        hostOf: (n) => n.host,
        isDisabled: (n) => n.disabled(),
        readEntry: (n) => {
          const value = n.value();
          return isUnset(value)
            ? null
            : {
                id: n.id(),
                disabled: n.disabled(),
                level: n.level(),
                expandable: n.expandable(),
                value,
              };
        },
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

  /** @see VirtualizedNavigator.invalidateSnapshot */
  invalidateSnapshot(): void {
    this.#core.invalidateSnapshot();
  }

  focusTarget(handle: ForTreeItemHandle<T>): void {
    this.#deps.setActiveId(handle.id());
  }

  current(): TreeFocusEntry<T> | null {
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

  typeaheadTo(handle: ForTreeItemHandle<T>): void {
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
    value: T;
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
