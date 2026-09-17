import { type Signal } from '@angular/core';

import {
  accessibleTextContent,
  firstEnabledHost,
  isUnset,
  type ListNavigationAction,
  moveIndex,
  type RovingTabindex,
  type Typeahead,
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
  /** Whether the node takes part in selection. */
  readonly selectable: boolean;
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
  /**
   * Re-seed focus on the node {@link FocusModel.current} resolved, so an intent
   * that acts on it in place — select, expand, collapse — leaves it focused and
   * back in view. A no-op when focus already rides a live node.
   */
  resumeActive(): void;
  /** Move focus to the next / previous / first / last enabled node. */
  navigate(action: ListNavigationAction): void;
  /** Move focus to the first child of the current node (an open parent). */
  enterChild(): void;
  /** Move focus to the current node's parent. */
  moveToParent(): void;
  /**
   * Feed a keydown to the shared typeahead buffer and move focus to the match.
   * Each model searches everything it can reach — the flattened visible nodes
   * in the roving path, the position snapshot in the virtualized one — so the
   * root never re-tests the mode to decide what a keystroke may match.
   *
   * `beforeMove` runs only once a match is resolved and before focus moves, so
   * a root guard that rejects the move (the `selectionFollowsFocus` +
   * virtualization throw) still precedes it.
   *
   * @returns `true` when the key was a printable character the buffer consumed.
   */
  handleTypeahead(event: KeyboardEvent, beforeMove: () => void): boolean;
}

/** Wiring for {@link RovingFocusModel}. */
export interface RovingFocusModelDeps<T = unknown> {
  /** The shared roving-tabindex tracker driving the single tab stop. */
  readonly roving: RovingTabindex;
  /** The root's typeahead buffer, shared with the other focus model. */
  readonly typeahead: Typeahead;
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
    return {
      value: handle.value(),
      expandable: handle.expandable(),
      disabled: handle.disabled(),
      selectable: handle.selectable(),
    };
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
    if (target.selectable()) {
      this.#deps.selectOnFocus(target.value());
    }
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

  /** No-op: DOM focus rides the `treeitem`, so it is never lost to an unmount. */
  resumeActive(): void {}

  handleTypeahead(event: KeyboardEvent, beforeMove: () => void): boolean {
    if (!this.#deps.typeahead.handle(event)) {
      return false;
    }
    const buffer = this.#deps.typeahead.buffer().toLowerCase();
    if (!buffer) {
      return true;
    }
    const match = this.#deps.visibleHandles().find((handle) => {
      if (handle.disabled()) {
        return false;
      }
      const labelEl = handle.labelEl();
      const text = (handle.textValue() || (labelEl ? accessibleTextContent(labelEl) : ''))
        .trim()
        .toLowerCase();
      return text.startsWith(buffer);
    });
    if (match) {
      beforeMove();
      this.#deps.roving.focusActive(match.host);
    }
    return true;
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
  readonly selectable: boolean;
  readonly level: number;
  readonly expandable: boolean;
  readonly value: T;
  readonly label: string;
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
  /** The root's typeahead buffer, shared with the other focus model. */
  readonly typeahead: Typeahead;
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
                selectable: n.selectable(),
                level: n.level(),
                expandable: n.expandable(),
                value,
                label: n.typeaheadText(),
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
    return {
      value: cur.value,
      expandable: cur.expandable,
      disabled: cur.disabled,
      selectable: cur.selectable,
    };
  }

  /**
   * Re-seed `aria-activedescendant` on the retained position, emitting
   * `(scrollToIndex)` when that node is outside the rendered window so it comes
   * back into view. A no-op while a node is already active.
   */
  resumeActive(): void {
    if (this.#deps.getActiveId() !== null) {
      return;
    }
    const resume = this.#resumePos();
    if (resume === null) {
      return;
    }
    this.#core.seedActive(resume);
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

  /**
   * Match the keystroke against the position snapshot rather than the rendered
   * window, then **seed** the match instead of pointing activedescendant at a
   * live host: a node the consumer's virtualizer has unmounted is reachable,
   * and reaching it emits `(scrollToIndex)` so the window comes to it.
   */
  handleTypeahead(event: KeyboardEvent, beforeMove: () => void): boolean {
    const { handled, pos } = this.#core.resolveTypeahead(
      this.#deps.typeahead,
      event,
      (entry) => entry.label,
    );
    if (pos !== null) {
      beforeMove();
      this.#core.seedActive(pos);
    }
    return handled;
  }

  /**
   * Resolve the active node's position entry from live items first, then the
   * snapshot. With no active id, falls back to the retained resume position so
   * every intent — not only directional navigation — recovers the node the tree
   * was on when it unmounted. Returns `{ pos, value, level, expandable,
   * disabled }` or `null` when nothing is active and nothing is retained.
   */
  #currentEntry(): {
    pos: number;
    value: T;
    level: number;
    expandable: boolean;
    disabled: boolean;
    selectable: boolean;
  } | null {
    const currentId = this.#deps.getActiveId();
    if (currentId === null) {
      return this.#resumeEntry();
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
          selectable: live.selectable(),
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
          selectable: entry.selectable,
        };
      }
    }
    return null;
  }

  /**
   * The retained position, bounded against the current `totalCount`. Returns
   * `null` when nothing is retained or the count has shrunk past it.
   */
  #resumePos(): number | null {
    const resume = this.#deps.getResumePos();
    if (resume === null || resume < 0) {
      return null;
    }
    const total = this.#deps.totalCount();
    if (total === undefined || resume >= total) {
      return null;
    }
    return resume;
  }

  /** The position entry the retained position resolves to in the snapshot. */
  #resumeEntry(): {
    pos: number;
    value: T;
    level: number;
    expandable: boolean;
    disabled: boolean;
    selectable: boolean;
  } | null {
    const pos = this.#resumePos();
    if (pos === null) {
      return null;
    }
    const entry = this.#core.snapshotByPos().get(pos);
    if (!entry) {
      return null;
    }
    return {
      pos,
      value: entry.value,
      level: entry.level,
      expandable: entry.expandable,
      disabled: entry.disabled,
      selectable: entry.selectable,
    };
  }
}
