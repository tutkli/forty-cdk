import { type Signal } from '@angular/core';

import {
  accessibleTextContent,
  firstEnabledHandle,
  isUnset,
  type ListNavigationAction,
  moveIndex,
  resolveListTypeahead,
  type RovingTabindex,
  type Typeahead,
  VirtualizedNavigator,
  type VirtualizedNavigatorDeps,
  type VirtualizedResume,
  type Unset,
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
  /**
   * Resolve the currently-focused node, or `null` when nothing is focused:
   * `from` when it is a node of the model, the current node otherwise.
   */
  current(from?: HTMLElement): TreeFocusEntry<T> | null;
  /**
   * Re-seed focus on the node {@link FocusModel.current} resolved, so an intent
   * that acts on it in place — select, expand, collapse — leaves it focused and
   * back in view. A no-op when focus already rides a live node.
   */
  resumeActive(): void;
  /**
   * Move focus to the next / previous / first / last enabled node, stepping from
   * `from` when it is a node of the model and from the current node otherwise.
   */
  navigate(action: ListNavigationAction, from: HTMLElement): void;
  /**
   * Move focus to the first child of an open parent, resolved like
   * {@link FocusModel.current}. A no-op when the node has no child rendered or
   * known to the model.
   */
  enterChild(from: HTMLElement): void;
  /** Move focus to the parent of the node {@link FocusModel.current} resolves from `from`. */
  moveToParent(from: HTMLElement): void;
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
   * Selection-follows-focus hook. Called with the destination value after
   * every keyboard focus move (navigation, entering a child, leaving to the
   * parent, a typeahead match) when single-mode selection should track focus;
   * a no-op when the tree is multi-select or the option is off.
   */
  readonly selectOnFocus: (value: T | Unset) => void;
  readonly beforeKeyboardMove: () => void;
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

  current(from?: HTMLElement): TreeFocusEntry<T> | null {
    const entry = this.#currentNode(from);
    if (!entry) {
      return null;
    }
    const handle = entry.handle;
    return {
      value: entry.value,
      expandable: handle.expandable(),
      disabled: handle.disabled(),
      selectable: handle.selectable(),
    };
  }

  navigate(action: ListNavigationAction, from: HTMLElement): void {
    const active = this.#deps.roving.active();
    const items = this.#deps.visibleHandles();
    if (items.length === 0) {
      return;
    }
    const fromIndex = items.findIndex((item) => item.host === from);
    const currentIndex =
      fromIndex >= 0 ? fromIndex : items.findIndex((item) => item.host === active);
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
    this.#focusFromKeyboard(target);
  }

  enterChild(from: HTMLElement): void {
    const entry = this.#currentNode(from);
    if (!entry) {
      return;
    }
    const child = entry.handle.childContainer();
    const firstChild = child ? firstEnabledHandle(child.items()) : null;
    if (firstChild) {
      this.#focusFromKeyboard(firstChild);
    }
  }

  moveToParent(from: HTMLElement): void {
    const parentHost = this.#currentNode(from)?.parentHost;
    if (!parentHost) {
      return;
    }
    const parent = this.#deps.visibleHandles().find((handle) => handle.host === parentHost);
    if (parent) {
      this.#focusFromKeyboard(parent);
    }
  }

  /** No-op: DOM focus rides the `treeitem`, so it is never lost to an unmount. */
  resumeActive(): void {}

  handleTypeahead(event: KeyboardEvent, beforeMove: () => void): boolean {
    const active = this.#deps.roving.active();
    const items = this.#deps.visibleHandles();
    const { handled, match } = resolveListTypeahead(this.#deps.typeahead, event, {
      items,
      anchorIndex: items.findIndex((handle) => handle.host === active),
      getText: (handle) => {
        const labelEl = handle.labelEl();
        return handle.textValue() || (labelEl ? accessibleTextContent(labelEl) : '');
      },
      isDisabled: (handle) => handle.disabled(),
    });
    if (match) {
      beforeMove();
      this.#focusFromKeyboard(match);
    }
    return handled;
  }

  #focusFromKeyboard(target: ForTreeItemHandle<T>): void {
    this.#deps.beforeKeyboardMove();
    this.#deps.roving.focusActive(target.host);
    if (target.selectable()) {
      this.#deps.selectOnFocus(target.value());
    }
  }

  #currentNode(from?: HTMLElement): ForTreeVisibleNode<T> | null {
    const nodes = this.#deps.visibleNodes();
    const own = from === undefined ? undefined : nodes.find((entry) => entry.handle.host === from);
    if (own) {
      return own;
    }
    const active = this.#deps.roving.active();
    if (active === null) {
      return null;
    }
    return nodes.find((entry) => entry.handle.host === active) ?? null;
  }
}

/** Position-snapshot entry carried by the tree's virtualized navigation engine. */
export interface TreePositionEntry<T> {
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
 * `false`) and minus `getResumePos`, which the model supplies to the engine
 * itself from the root's resume position, so every intent resolves the resume
 * through the same validation.
 */
export type ActiveDescendantFocusModelDeps<T = unknown> = Omit<
  VirtualizedNavigatorDeps<ForTreeItemHandle<T>>,
  'loop' | 'getResumePos'
> & {
  /**
   * The position retained when the active node unmounts, so every intent
   * resumes from it instead of restarting at the edge.
   */
  readonly resume: VirtualizedResume<T, TreePositionEntry<T>>;
  /** The root's typeahead buffer, shared with the other focus model. */
  readonly typeahead: Typeahead;
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
};

interface TreeLevelWalk {
  readonly target: 'parent' | 'child';
  readonly pos: number;
  readonly level: number;
  readonly origin: string | null;
}

interface TreeResumeMatch<T> {
  readonly pos: number;
  readonly entry: TreePositionEntry<T>;
}

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

  readonly #core: VirtualizedNavigator<ForTreeItemHandle<T>, TreePositionEntry<T>>;

  #walk: TreeLevelWalk | null = null;

  #latestSnapshot: ReadonlyMap<number, TreePositionEntry<T>> | null = null;

  #previousSnapshot: ReadonlyMap<number, TreePositionEntry<T>> | null = null;

  constructor(deps: ActiveDescendantFocusModelDeps<T>) {
    this.#deps = deps;
    this.#core = new VirtualizedNavigator(
      { ...deps, loop: () => false, getResumePos: () => this.#resolveResume()?.pos ?? null },
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
    const current = this.#core.snapshotByPos();
    if (current !== this.#latestSnapshot) {
      this.#previousSnapshot = this.#latestSnapshot;
      this.#latestSnapshot = current;
    }
  }

  /** @see VirtualizedNavigator.tryResolvePending */
  tryResolvePending(): boolean {
    if (this.#core.tryResolvePending()) {
      return true;
    }
    const walk = this.#walk;
    if (walk === null || !this.#isKnown(walk.pos)) {
      return false;
    }
    const active = this.#deps.getActiveId();
    if (active !== null && active !== walk.origin) {
      this.#walk = null;
      return false;
    }
    this.#runWalk(walk);
    return true;
  }

  /** @see VirtualizedNavigator.invalidateSnapshot */
  invalidateSnapshot(): void {
    this.#core.invalidateSnapshot();
  }

  /** @see VirtualizedNavigator.snapshotByPos */
  snapshotByPos(): ReadonlyMap<number, TreePositionEntry<T>> {
    return this.#core.snapshotByPos();
  }

  focusTarget(handle: ForTreeItemHandle<T>): void {
    this.#walk = null;
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
   * Re-seed `aria-activedescendant` on the retained node, emitting
   * `(scrollToIndex)` when that node is outside the rendered window so it comes
   * back into view. A retained node that is no longer at its position is found
   * by value, and one that is no longer visible resumes on its nearest visible
   * ancestor. A no-op while a node is already active.
   */
  resumeActive(): void {
    if (this.#deps.getActiveId() !== null) {
      return;
    }
    const resume = this.#resolveResume();
    if (resume === null) {
      return;
    }
    this.#walk = null;
    this.#core.seedActive(resume.pos);
  }

  resumeRendered(): boolean {
    const resume = this.#resolveResume();
    if (resume === null) {
      return false;
    }
    const live = this.#deps.items().find((n) => n.itemIndex() === resume.pos);
    if (!live || live.disabled()) {
      return false;
    }
    this.focusTarget(live);
    return true;
  }

  navigate(action: ListNavigationAction): void {
    this.#walk = null;
    this.#core.navigate(action);
  }

  /**
   * Move activedescendant to the first enabled child of the current node: the
   * first node one level deeper that follows it in pre-order flat space,
   * passing over disabled children and their subtrees. No-op when there is no
   * active node, when the node has no child in the flattened list, or when
   * every child is disabled. A position the window has never rendered is
   * scrolled into view and the walk continues once it mounts.
   */
  enterChild(): void {
    const cur = this.#currentEntry();
    if (!cur) return;
    this.#runWalk({
      target: 'child',
      pos: cur.pos + 1,
      level: cur.level + 1,
      origin: this.#deps.getActiveId(),
    });
  }

  /**
   * Move activedescendant to the parent: the nearest preceding node at a
   * shallower level. A position between the node and its parent that the
   * window has never rendered is scrolled into view and the walk continues
   * once it mounts, so the move never lands on a node past an unknown gap.
   * No-op on a top-level node.
   */
  moveToParent(): void {
    const cur = this.#currentEntry();
    if (!cur || cur.level <= 1) return;
    this.#runWalk({
      target: 'parent',
      pos: cur.pos - 1,
      level: cur.level,
      origin: this.#deps.getActiveId(),
    });
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
      this.#walk = null;
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
      const value = live.value();
      if (pos !== null && !isUnset(value)) {
        return {
          pos,
          value,
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

  #runWalk(walk: TreeLevelWalk): void {
    this.#walk = null;
    const total = this.#deps.totalCount();
    if (total === undefined) return;
    const step = walk.target === 'parent' ? -1 : 1;
    const live = this.#liveByPos();
    const indexed = this.#core.snapshotByPos();
    for (let pos = walk.pos; pos >= 0 && pos < total; pos += step) {
      const handle = live.get(pos);
      const entry = handle
        ? { level: handle.level(), disabled: handle.disabled() }
        : indexed.get(pos);
      if (entry === undefined) {
        this.#core.resetPending();
        this.#walk = { ...walk, pos };
        this.#deps.emitScrollToIndex(pos);
        return;
      }
      if (walk.target === 'parent') {
        if (entry.level < walk.level) {
          this.#core.seedActive(pos);
          return;
        }
        continue;
      }
      if (entry.level < walk.level) return;
      if (entry.level === walk.level && !entry.disabled) {
        this.#core.seedActive(pos);
        return;
      }
    }
  }

  #isKnown(pos: number): boolean {
    return this.#core.snapshotByPos().has(pos) || this.#liveByPos().has(pos);
  }

  #liveByPos(): Map<number, ForTreeItemHandle<T>> {
    const live = new Map<number, ForTreeItemHandle<T>>();
    for (const handle of this.#deps.items()) {
      const pos = handle.itemIndex();
      if (pos !== null) {
        live.set(pos, handle);
      }
    }
    return live;
  }

  #resolveResume(): TreeResumeMatch<T> | null {
    const exact = this.#deps.resume.resolve();
    if (exact !== null) {
      return exact;
    }
    const retained = this.#deps.resume.retained();
    if (retained === null) {
      return null;
    }
    return this.#findByValue(retained.value) ?? this.#visibleAncestor(retained.pos, retained.value);
  }

  #findByValue(value: T): TreeResumeMatch<T> | null {
    const total = this.#deps.totalCount();
    const equals = this.#deps.compareWith();
    for (const [pos, entry] of this.#core.snapshotByPos()) {
      if (total !== undefined && pos < total && equals(entry.value, value)) {
        return { pos, entry };
      }
    }
    return null;
  }

  #visibleAncestor(pos: number, value: T): TreeResumeMatch<T> | null {
    const previous = this.#previousSnapshot;
    const origin = previous?.get(pos);
    if (!previous || !origin || !this.#deps.compareWith()(origin.value, value)) {
      return null;
    }
    let level = origin.level;
    for (let p = pos - 1; p >= 0 && level > 1; p--) {
      const entry = previous.get(p);
      if (!entry) {
        return null;
      }
      if (entry.level < level) {
        level = entry.level;
        const match = this.#findByValue(entry.value);
        if (match !== null) {
          return match;
        }
      }
    }
    return null;
  }

  /** The position entry the retained target resolves to in the snapshot. */
  #resumeEntry(): {
    pos: number;
    value: T;
    level: number;
    expandable: boolean;
    disabled: boolean;
    selectable: boolean;
  } | null {
    const resumed = this.#resolveResume();
    if (resumed === null) {
      return null;
    }
    const { pos, entry } = resumed;
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
