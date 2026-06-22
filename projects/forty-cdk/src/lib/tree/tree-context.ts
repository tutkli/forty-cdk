import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  type ListNavigationAction,
  type WritingDirection,
  type RovingTabindex,
} from 'forty-cdk/core';

/** A visible tree node plus its resolved parent host — the flattened list the root walks. */
export interface ForTreeVisibleNode {
  readonly handle: ForTreeItemHandle;
  readonly parentHost: HTMLElement | null;
}

/**
 * Handle a `ForTreeItem` registers with its enclosing container so the root
 * can flatten the currently-visible nodes, run typeahead, and resolve the
 * roving-tabindex entry point — all from registered handles plus the
 * `expanded` set, never from the DOM.
 */
export interface ForTreeItemHandle {
  /** The `role="treeitem"` host element. */
  readonly host: HTMLElement;
  /** Stable node value. */
  readonly value: Signal<string>;
  /** Effective disabled state (own `disabled` OR the root's `disabled`). */
  readonly disabled: Signal<boolean>;
  /** Whether a `[forTreeItemToggle]` is registered, marking the item a parent. */
  readonly expandable: Signal<boolean>;
  /** Nested `[forTreeGroup]` container, present only while the item is expanded. */
  readonly childContainer: Signal<ForTreeContainerContext | null>;
  /** Typeahead text override; empty when the default label text should be used. */
  readonly textValue: Signal<string>;
  /** The `[forTreeItemLabel]` element, used as the default typeahead text source. */
  readonly labelEl: Signal<HTMLElement | null>;
  /** Stable host id for the activedescendant focus model (virtualized path). */
  readonly id: Signal<string>;
  /** Absolute index in the flattened visible-node list; `null` outside the virtualized path. */
  readonly itemIndex: Signal<number | null>;
  /** Resolved tree depth (1-based). Used for flat-space parent/child navigation. */
  readonly level: Signal<number>;
}

/**
 * Root-only coordination contract owned by `ForTree`. Items derive their
 * selection / expansion state from it; keyboard and pointer handlers route
 * navigation, selection, and expansion through it.
 */
export interface ForTreeContext {
  /** Selected node values. Single mode keeps the array at length <= 1. */
  readonly value: Signal<readonly string[]>;
  /** Open (expanded) parent node values. Always multi — no single mode. */
  readonly expanded: Signal<readonly string[]>;
  readonly multiple: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly selectionFollowsFocus: Signal<boolean>;
  /** Selection presentation: `'highlight'` (aria-selected) or `'checkbox'` (aria-checked). */
  readonly selectionMode: Signal<'highlight' | 'checkbox'>;
  /** Whether cascade selection is enabled (checkbox mode only). */
  readonly cascade: Signal<boolean>;
  readonly roving: RovingTabindex;
  /**
   * Length of the flattened visible-node list when virtualizing, `undefined` in
   * the roving-tabindex path. Setting it (via `[forTree][totalCount]`) switches
   * the tree to the activedescendant focus model.
   */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive `[start, end)` rendered window; `undefined` when not virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;
  /**
   * The active node's id under the activedescendant focus model, `null` in the
   * roving path. The root reflects it as `aria-activedescendant`; items read it
   * for `data-highlighted`.
   */
  readonly activeDescendantId: Signal<string | null>;
  /**
   * Called by an item on pointer activation in the virtualized path: moves
   * `aria-activedescendant` to that item and returns DOM focus to the tree
   * container. A no-op in the roving path.
   */
  notifyItemClick(itemId: string): void;

  isExpanded(value: string): boolean;
  isSelected(value: string): boolean;
  /**
   * Tri-state check status of a node in checkbox mode: `'true'` / `'false'`, or
   * `'mixed'` for a cascade parent with some-but-not-all descendants checked.
   */
  checkState(value: string): 'true' | 'false' | 'mixed';
  /** Open or close a node, mutating the `expanded` array immutably. */
  setExpanded(value: string, open: boolean): void;
  /** Single mode replaces the selection; multi mode toggles the value. */
  select(value: string): void;
  /**
   * Move roving focus from `currentItem` to the next / previous / first /
   * last enabled node in visible (flattened) order. In single mode with
   * `selectionFollowsFocus`, the destination is also selected.
   */
  navigate(currentItem: HTMLElement, action: ListNavigationAction): void;
  /**
   * Right arrow (LTR): expand a closed parent (focus stays); on an open
   * parent move focus to its first child; no-op on a leaf.
   */
  expandOrEnter(currentItem: HTMLElement): void;
  /**
   * Left arrow (LTR): collapse an open parent (focus stays); otherwise move
   * focus to the parent node; no-op at a closed root-level node.
   */
  collapseOrLeave(currentItem: HTMLElement): void;
  /** `*`: expand every sibling parent at the focused node's level. */
  expandSiblings(currentItem: HTMLElement): void;
  /**
   * Multi mode only. Shift+Arrow: move focus to the next / previous visible
   * node and toggle its selection.
   */
  extendByArrow(currentItem: HTMLElement, action: 'next' | 'prev'): void;
  /**
   * Multi mode only. Shift+Space: select every enabled visible node from the
   * anchor (set on the last unmodified selection) up to and including
   * `currentItem`.
   */
  selectRangeToFocused(currentItem: HTMLElement): void;
  /**
   * Multi mode only. Ctrl/Cmd+A: select every enabled visible node, or clear
   * the selection when all visible nodes are already selected.
   */
  selectAll(): void;
  /**
   * Forward a keydown to the typeahead helper. When the key is printable,
   * focuses the first matching visible node and returns `true`.
   */
  handleTypeahead(event: KeyboardEvent): boolean;
  /** Whether `el` is the first enabled root node — the default roving-tabindex entry point. */
  isFirstFocusableItem(el: HTMLElement): boolean;
  /**
   * Flattened currently-visible nodes in DOM order, each with its resolved parent host. Exposed for
   * drag-drop composition (`[forTreeNodeDrag]`). Reflects expansion: collapsed subtrees are absent.
   */
  readonly visibleNodes: Signal<readonly ForTreeVisibleNode[]>;
}

export const FOR_TREE_CONTEXT = new InjectionToken<ForTreeContext>('FOR_TREE_CONTEXT');

/**
 * Container contract implemented by both `ForTree` (the root, level 1) and
 * every `ForTreeGroup` (level = parent item level + 1). Items register here
 * to get their `aria-level` / `aria-posinset` / `aria-setsize`, and the root
 * walks containers recursively to flatten the visible nodes.
 */
export interface ForTreeContainerContext {
  readonly level: Signal<number>;
  readonly items: Signal<readonly ForTreeItemHandle[]>;
  registerItem(handle: ForTreeItemHandle): void;
  unregisterItem(handle: ForTreeItemHandle): void;
  indexOfHost(el: HTMLElement): number;
}

export const FOR_TREE_CONTAINER_CONTEXT = new InjectionToken<ForTreeContainerContext>(
  'FOR_TREE_CONTAINER_CONTEXT',
);

/**
 * Per-item contract provided by `ForTreeItem`, consumed by its label, toggle,
 * and nested group. A registered toggle marks the item expandable (D4); the
 * nested group reads `level` and registers itself as the item's child
 * container.
 */
export interface ForTreeItemContext {
  readonly value: Signal<string>;
  readonly level: Signal<number>;
  readonly expanded: Signal<boolean>;
  readonly expandable: Signal<boolean>;
  /** Whether this node is in the root's selection set (its `aria-checked` / `aria-selected` state). */
  readonly selected: Signal<boolean>;
  /** Tri-state checkbox status of this node (`'true'` / `'false'` / `'mixed'`). */
  readonly checkState: Signal<'true' | 'false' | 'mixed'>;
  /** Register a toggle. Presence makes the item expandable (D4). Returns an unregister fn. */
  registerToggle(): () => void;
  /** Set (or clear, on collapse) the nested `[forTreeGroup]` container. */
  setChildContainer(container: ForTreeContainerContext | null): void;
  /** Set (or clear) the `[forTreeItemLabel]` element used for typeahead text. */
  setLabel(el: HTMLElement | null): void;
  /** Toggle expansion. No-op on leaves or when disabled. */
  toggle(): void;
  /** Select / activate the item. No-op when disabled. */
  select(): void;
  /** Move roving focus to the item. No-op when disabled. */
  focusItem(): void;
}

export const FOR_TREE_ITEM_CONTEXT = new InjectionToken<ForTreeItemContext>(
  'FOR_TREE_ITEM_CONTEXT',
);

/** Injects the nearest {@link ForTreeContext}, throwing a prefixed error if absent. */
export function injectTreeContext(piece: string): ForTreeContext {
  const ctx = inject(FOR_TREE_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/tree] ${piece} must be used inside a [forTree] element.`);
  }
  return ctx;
}

/** Injects the nearest {@link ForTreeContainerContext} (the root or a group). */
export function injectTreeContainerContext(piece: string): ForTreeContainerContext {
  const ctx = inject(FOR_TREE_CONTAINER_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/tree] ${piece} must be used inside a [forTree] or [forTreeGroup] element.`,
    );
  }
  return ctx;
}

/** Injects the nearest enclosing {@link ForTreeItemContext}. */
export function injectTreeItemContext(piece: string): ForTreeItemContext {
  const ctx = inject(FOR_TREE_ITEM_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/tree] ${piece} must be used inside a [forTreeItem] element.`);
  }
  return ctx;
}
