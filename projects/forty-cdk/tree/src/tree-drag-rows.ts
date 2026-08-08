import type { ForTreeVisibleNode } from './tree-context';
import { type TreeDropRow } from './tree-drop-resolver';

/**
 * Pure helpers that turn the tree's visible-node list into the flat row / label data the
 * drag resolver and announcements consume. Framework-free and unit-testable. Not public.
 */

/** The origin bookkeeping captured when a node is lifted. */
export interface TreeLiftContext<T = unknown> {
  /** The lifted node's value. */
  readonly value: T;
  /** The lifted node's parent value, or `null` at the root. */
  readonly parentValue: T | null;
  /** The lifted node's index among its siblings before the move. */
  readonly previousIndex: number;
}

/**
 * Builds the flat, DOM-ordered rows the drop resolver works on, EXCLUDING the lifted node
 * (whose subtree is collapsed during the drag). Reads each row's live viewport rect.
 *
 * @param visible The tree's currently visible nodes, in DOM order.
 * @param liftedValue The value of the node being dragged, filtered out of the result.
 * @param equals The tree's node-value comparator.
 */
export function buildTreeDropRows<T>(
  visible: readonly ForTreeVisibleNode<T>[],
  liftedValue: T | null,
  equals: (a: T, b: T) => boolean,
): TreeDropRow<T>[] {
  return visible
    .filter((e) => liftedValue === null || !equals(e.handle.value(), liftedValue))
    .map((e) => {
      const rect = e.handle.host.getBoundingClientRect();
      return {
        value: e.handle.value(),
        level: e.handle.level(),
        left: rect.left,
        top: rect.top,
        bottom: rect.bottom,
      };
    });
}

/** The visible row's trimmed accessible label (its label element, else its text content). */
export function treeNodeLabel(entry: ForTreeVisibleNode<unknown>): string {
  const labelEl = entry.handle.labelEl();
  return (labelEl?.textContent ?? entry.handle.host.textContent ?? '').trim();
}

/**
 * Whether a pointerdown inside `itemHost` may start a drag, honoring drag handles: when the
 * item contains one or more registered handles, the press must land inside one; an item with
 * no handle is grabbable anywhere.
 *
 * @param itemHost The `[forTreeItem]` host the press landed in.
 * @param target The pointerdown event target — a `Node`, because a press can land on a non-HTML
 * node such as an `<svg>` icon inside the grab area, and containment is all this check needs.
 * @param handles All registered drag-handle elements (across the whole tree).
 */
export function isInsideGrabArea(
  itemHost: HTMLElement,
  target: Node,
  handles: ReadonlySet<HTMLElement>,
): boolean {
  const itemHandles = [...handles].filter((h) => itemHost.contains(h));
  if (itemHandles.length === 0) {
    return true;
  }
  return itemHandles.some((h) => h === target || h.contains(target));
}

/** The trimmed label for `parentValue`, or `null` when it has no row (root drop). */
export function treeParentLabel<T>(
  visible: readonly ForTreeVisibleNode<T>[],
  parentValue: T | null,
  equals: (a: T, b: T) => boolean,
): string | null {
  if (parentValue === null) {
    return null;
  }
  const entry = visible.find((e) => equals(e.handle.value(), parentValue));
  return entry ? treeNodeLabel(entry) : null;
}

/**
 * Captures the lifted node's origin (value, parent, sibling index) from its position in the
 * visible list, before any collapse-on-lift mutates the tree.
 *
 * @param visible The visible nodes at lift time, in DOM order.
 * @param visibleIdx The lifted node's index within `visible`.
 */
export function resolveTreeLiftContext<T>(
  visible: readonly ForTreeVisibleNode<T>[],
  visibleIdx: number,
): TreeLiftContext<T> | null {
  const entry = visible[visibleIdx];
  if (!entry) {
    return null;
  }
  const parentHost = entry.parentHost;
  const parentEntry = parentHost ? visible.find((e) => e.handle.host === parentHost) : null;
  const previousIndex = visible.filter(
    (e) => e.parentHost === parentHost && visible.indexOf(e) < visibleIdx,
  ).length;
  return {
    value: entry.handle.value(),
    parentValue: parentEntry ? parentEntry.handle.value() : null,
    previousIndex,
  };
}

/**
 * Resolves the initial insertion gap after a collapse-on-lift re-renders the visible list.
 * Pointer lifts clamp the original `visibleIdx` to the row count; keyboard lifts map it to the
 * first row whose post-collapse visible index is at or past `visibleIdx` (`rows.length` if
 * none), keeping the cursor where the focused node sat.
 *
 * @param rows The post-collapse drop rows (lifted node already excluded).
 * @param visibleAfter The visible nodes after the collapse.
 * @param visibleIdx The lifted node's index before the collapse.
 * @param mode Whether the lift was started by pointer or keyboard.
 * @param equals The tree's node-value comparator.
 */
export function resolveLiftGap<T>(
  rows: readonly TreeDropRow<T>[],
  visibleAfter: readonly ForTreeVisibleNode<T>[],
  visibleIdx: number,
  mode: 'keyboard' | 'pointer',
  equals: (a: T, b: T) => boolean,
): number {
  if (mode === 'pointer') {
    return Math.min(visibleIdx, rows.length);
  }
  const gap = rows.findIndex((r) => {
    const nextEntry = visibleAfter.find((e) => equals(e.handle.value(), r.value));
    return nextEntry && visibleAfter.indexOf(nextEntry) >= visibleIdx;
  });
  return gap < 0 ? rows.length : gap;
}
