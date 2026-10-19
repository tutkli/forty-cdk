import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  type ListNavigationAction,
  orphanContextError,
  type RovingTabindex,
  type Typeahead,
  type VirtualizedResume,
  type WritingDirection,
  type Unset,
} from 'forty-cdk/core';
import type { ActiveDescendantFocusModel, TreePositionEntry } from './focus-model';

/**
 * A visible tree node plus its resolved parent host — the flattened list the root walks.
 *
 * Generic over the node value type, which `ForTree` instantiates at its own `T`.
 */
export interface ForTreeVisibleNode<T = unknown> {
  readonly handle: ForTreeItemHandle<T>;
  /** The node's value, as read when the node was flattened. */
  readonly value: T;
  readonly parentHost: HTMLElement | null;
}

/**
 * Handle a `ForTreeItem` registers with its enclosing container so the root
 * can flatten the currently-visible nodes, run typeahead, and resolve the
 * roving-tabindex entry point — all from registered handles plus the
 * `expanded` set, never from the DOM.
 */
export interface ForTreeItemHandle<T = unknown> {
  /** The `role="treeitem"` host element. */
  readonly host: HTMLElement;
  /**
   * Stable node value, or {@link Unset} while the item's `[value]` binding is
   * still unwritten.
   */
  readonly value: Signal<T | Unset>;
  /** Effective disabled state (own `disabled` OR the root's `disabled`). */
  readonly disabled: Signal<boolean>;
  /**
   * Whether the node takes part in selection. A `false` node stays in
   * navigation and typeahead but carries no selection state, never enters the
   * root's `value`, and drops out of a cascade's descendant set.
   */
  readonly selectable: Signal<boolean>;
  /** Whether a `[forTreeItemToggle]` is registered, marking the item a parent. */
  readonly expandable: Signal<boolean>;
  /** Nested `[forTreeGroup]` container, present only while the item is expanded. */
  readonly childContainer: Signal<ForTreeContainerContext<T> | null>;
  /**
   * Text override for the node's name, honored by typeahead matching and by the
   * drag announcements; empty when the label's text should be used.
   */
  readonly textValue: Signal<string>;
  /** The `[forTreeItemLabel]` element, used as the default text source. */
  readonly labelEl: Signal<HTMLElement | null>;
  /**
   * The resolved typeahead text — `textValue` when set, else the label
   * element's text. The root folds it into the virtualized position snapshot so
   * typeahead can reach a node the window has unmounted; the roving path reads
   * the live label instead, so a text-only change is picked up there on the next
   * keystroke.
   */
  readonly typeaheadText: Signal<string>;
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
 *
 * Generic over the node value type. The contract itself defaults to `unknown`,
 * which is how the token is declared; `ForTree<T = string>` instantiates it at
 * its own `T`, the one type that keys `[(value)]`, `[(expanded)]` and
 * `[forTreeItem][value]`. Node identity is resolved by {@link ForTreeContext.compareWith}.
 */
export interface ForTreeContext<T = unknown> {
  /** Selected node values. Single mode keeps the array at length <= 1. */
  readonly value: Signal<readonly T[]>;
  /** Open (expanded) parent node values. Always multi — no single mode. */
  readonly expanded: Signal<readonly T[]>;
  /**
   * Equality comparator for node values, resolving every identity question the
   * tree asks — selection and expansion membership, cascade descendants, the
   * range anchor, and drag-drop drop resolution. Defaults to `===`.
   */
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
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
   * the roving-tabindex path. Setting it (via `[forTreeVirtualized][totalCount]`)
   * switches the tree to the activedescendant focus model.
   */
  readonly totalCount: Signal<number | undefined>;
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

  isExpanded(value: T | Unset): boolean;
  isSelected(value: T | Unset): boolean;
  /**
   * Tri-state check status of a node in checkbox mode: `'true'` / `'false'`, or
   * `'mixed'` for a cascade parent with some-but-not-all descendants checked.
   */
  checkState(value: T | Unset): 'true' | 'false' | 'mixed';
  /** Open or close a node, mutating the `expanded` array immutably. */
  setExpanded(value: T | Unset, open: boolean): void;
  /**
   * Single mode replaces the selection; multi mode toggles the value. A value
   * belonging to a `[selectable]="false"` node is ignored.
   */
  select(value: T | Unset): void;
  /**
   * Move roving focus from `currentItem` to the next / previous / first /
   * last enabled node in visible (flattened) order. In single mode with
   * `selectionFollowsFocus`, the destination is also selected.
   */
  navigate(currentItem: HTMLElement, action: ListNavigationAction): void;
  /**
   * Right arrow (LTR): expand a closed parent (focus stays); on an open
   * parent move focus to its first child; no-op on a leaf. A disabled node
   * is never expanded, and still moves focus into its children when open.
   */
  expandOrEnter(currentItem: HTMLElement): void;
  /**
   * Left arrow (LTR): collapse an open parent (focus stays); otherwise move
   * focus to the parent node; no-op at a closed root-level node. A disabled
   * node is never collapsed, so it moves focus to its parent instead.
   */
  collapseOrLeave(currentItem: HTMLElement): void;
  /** `*`: expand every enabled sibling parent at the focused node's level. */
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
   * Multi mode only. Ctrl/Cmd+A: add every enabled visible node to the
   * selection, or remove them when they are all already selected. Selected
   * values that are not an enabled visible node are kept either way.
   */
  selectAll(): void;
  /**
   * Forward a keydown to the typeahead helper. When the key is printable,
   * focuses the first matching node and returns `true` — the visible nodes in
   * the roving path, every position the virtualized window has rendered at
   * least once in the activedescendant one.
   */
  handleTypeahead(event: KeyboardEvent): boolean;
  /**
   * Whether `el` is the default roving-tabindex entry point: the first enabled
   * selected node in visible order, or the first enabled visible node when
   * none is selected.
   */
  isFirstFocusableItem(el: HTMLElement): boolean;
  /**
   * Flattened currently-visible nodes in DOM order, each with its resolved parent host. Exposed for
   * drag-drop composition (`[forTreeNodeDrag]`). Reflects expansion: collapsed subtrees are absent,
   * and so is an item whose `[value]` binding is not written yet (see
   * {@link ForTreeItemHandle.value}) — it folds in on the run that writes it.
   */
  readonly visibleNodes: Signal<readonly ForTreeVisibleNode<T>[]>;
}

/**
 * Channel the tree's pieces report a press through, so the root emits
 * `(itemActivate)` before the selection is applied.
 */
export interface TreePieceContext<T = unknown> {
  /**
   * Activates `item` from the press `event`: emits the root's `(itemActivate)`,
   * then selects the node unless the handler vetoed it. A no-op on a disabled
   * node or one whose `[value]` binding is not written yet.
   */
  activateItem(item: ForTreeItemContext<T>, event: MouseEvent | KeyboardEvent): void;
  highlightFromPointer(host: HTMLElement, id: string): void;
  isItemHighlighted(host: HTMLElement): boolean;
  notifyItemFocus(host: HTMLElement): void;
  /**
   * Called by `[forTreeVirtualized]` from its constructor. Hands the root the
   * virtualized focus model and returns the root state that model reads and
   * writes.
   */
  registerVirtualization(virtualization: TreeVirtualization): TreeVirtualizationHost;
}

/**
 * The virtualized `aria-activedescendant` focus model `[forTreeVirtualized]`
 * lends the root. The root depends on this shape alone, so a tree without the
 * piece never references the navigation engine.
 */
export interface TreeVirtualization<T = unknown> {
  /** Length of the flattened node list, or `undefined` while the piece is present but unset. */
  readonly totalCount: Signal<number | undefined>;
  /** The position the root resumes from once its active node unmounts. */
  readonly resume: VirtualizedResume<T, TreePositionEntry<T>>;
  /** The activedescendant focus model, constructed on first use. */
  focusModel(): ActiveDescendantFocusModel<T>;
  /** Rejects a multi-select range shortcut, which the virtualized path does not support. */
  rejectRangeSelect(): void;
  /** Rejects a keyboard move while `selectionFollowsFocus` is set on a single-select tree. */
  assertSelectionFollowsFocusSupported(): void;
}

/** The root state the virtualized focus model reads and writes. */
export interface TreeVirtualizationHost<T = unknown> {
  /** The registered items — the rendered window. */
  readonly items: Signal<readonly ForTreeItemHandle<T>[]>;
  /** The root's typeahead buffer, shared with the roving focus model. */
  readonly typeahead: Typeahead;
  /** Whether more than one node can be selected, where `selectionFollowsFocus` is inert. */
  readonly multiSelect: Signal<boolean>;
  /** The active node's id. */
  getActiveId(): string | null;
  /** Move the active node, forgetting any retained resume position. */
  setActiveId(id: string | null): void;
  /** Open the pointer-suppression window before a programmatic scroll. */
  suppressPointer(): void;
}

/** What the tree's pieces resolve `FOR_TREE_CONTEXT` as. */
export interface TreeContext<T = unknown> extends ForTreeContext<T>, TreePieceContext<T> {}

/**
 * DI token for the tree's coordination surface, provided by `[forTree]`.
 *
 * Publicly typed as the read surface {@link ForTreeContext}. The pieces read the
 * same token at an internal type that adds the activation channel, so a wrapper
 * re-providing it must alias it to the root, together with the container token
 * root-level items register through:
 * `{ provide: FOR_TREE_CONTEXT, useExisting: MyTree }` and
 * `{ provide: FOR_TREE_CONTAINER_CONTEXT, useExisting: MyTree }`, where `MyTree`
 * extends `ForTree`. A value that merely satisfies the declared type resolves
 * too, and is rejected in dev mode by the first piece to reach the channel.
 */
export const FOR_TREE_CONTEXT = new InjectionToken<ForTreeContext>('FOR_TREE_CONTEXT');

/**
 * Container contract implemented by both `ForTree` (the root, level 1) and
 * every `ForTreeGroup` (level = parent item level + 1). Items register here
 * to get their `aria-level` / `aria-posinset` / `aria-setsize`, and the root
 * walks containers recursively to flatten the visible nodes.
 */
export interface ForTreeContainerContext<T = unknown> {
  readonly level: Signal<number>;
  readonly items: Signal<readonly ForTreeItemHandle<T>[]>;
  registerItem(handle: ForTreeItemHandle<T>): void;
  unregisterItem(handle: ForTreeItemHandle<T>): void;
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
export interface ForTreeItemContext<T = unknown> {
  /** The node's value, or {@link Unset} before its binding is written. */
  readonly value: Signal<T | Unset>;
  readonly level: Signal<number>;
  readonly expanded: Signal<boolean>;
  readonly expandable: Signal<boolean>;
  /**
   * Whether this node takes part in selection. `false` marks a structural node,
   * which carries no selection state and on which {@link ForTreeItemContext.select}
   * changes nothing.
   */
  readonly selectable: Signal<boolean>;
  /**
   * Whether this node is in the root's selection set (its `aria-checked` /
   * `aria-selected` state). Always `false` on a `[selectable]="false"` node.
   */
  readonly selected: Signal<boolean>;
  /** Whether this node is disabled, by its own `[disabled]` or the root's. */
  readonly effectiveDisabled: Signal<boolean>;
  /** Tri-state checkbox status of this node (`'true'` / `'false'` / `'mixed'`). */
  readonly checkState: Signal<'true' | 'false' | 'mixed'>;
  /** Register a toggle. Presence makes the item expandable (D4). Returns an unregister fn. */
  registerToggle(): () => void;
  /** Set (or clear, on collapse) the nested `[forTreeGroup]` container. */
  setChildContainer(container: ForTreeContainerContext<T> | null): void;
  /** Set (or clear) the `[forTreeItemLabel]` element used for typeahead text. */
  setLabel(el: HTMLElement | null): void;
  /** Toggle expansion. No-op on leaves or when disabled. */
  toggle(): void;
  /**
   * Select the item, without emitting the root's `(itemActivate)`. No-op when
   * disabled or not selectable.
   */
  select(): void;
  /** Move roving focus to the item. No-op when disabled. */
  focusItem(): void;
}

export const FOR_TREE_ITEM_CONTEXT = new InjectionToken<ForTreeItemContext>(
  'FOR_TREE_ITEM_CONTEXT',
);

/** Injects the nearest {@link ForTreeContext}, throwing a prefixed error if absent. */
export function injectTreeContext<T = unknown>(piece: string): TreeContext<T> {
  const ctx = inject(FOR_TREE_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-TREE-001',
      piece,
      root: '[forTree]',
      token: 'FOR_TREE_CONTEXT',
    });
  }
  const widened = ctx as unknown as TreeContext<T>;
  assertRootContext({
    entryPoint: 'tree',
    token: 'FOR_TREE_CONTEXT',
    root: '[forTree]',
    piece,
    probe: () => widened.activateItem,
  });
  return widened;
}

/** Injects the nearest {@link ForTreeContainerContext} (the root or a group). */
export function injectTreeContainerContext<T = unknown>(piece: string): ForTreeContainerContext<T> {
  const ctx = inject(FOR_TREE_CONTAINER_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-TREE-002',
      piece,
      root: '[forTree] or [forTreeGroup]',
      token: 'FOR_TREE_CONTAINER_CONTEXT',
    });
  }
  return ctx as unknown as ForTreeContainerContext<T>;
}

/** Injects the nearest enclosing {@link ForTreeItemContext}. */
export function injectTreeItemContext<T = unknown>(piece: string): ForTreeItemContext<T> {
  const ctx = inject(FOR_TREE_ITEM_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-TREE-003',
      piece,
      root: '[forTreeItem]',
      token: 'FOR_TREE_ITEM_CONTEXT',
    });
  }
  return ctx as unknown as ForTreeItemContext<T>;
}
