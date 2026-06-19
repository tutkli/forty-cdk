import type { ForTreeDragDropEvent } from './tree-drag-drop-event';

/** Options for {@link moveTreeNode}. */
export interface MoveTreeNodeOptions<T> {
  /** The move descriptor as emitted by `(nodeDrop)`. Carries the tree's string node values. */
  readonly event: ForTreeDragDropEvent;
  /** Stable id of a node — must return the same string used as the tree item `[value]`. */
  readonly trackBy: (node: T) => string;
  /** A node's children, or `undefined` / `[]` for a leaf. */
  readonly children: (node: T) => readonly T[] | undefined;
  /** Returns a copy of `node` with its children replaced. MUST NOT mutate `node`. */
  readonly withChildren: (node: T, children: readonly T[]) => T;
}

function collectSubtreeIds<T>(node: T, options: MoveTreeNodeOptions<T>): Set<string> {
  const ids = new Set<string>();
  ids.add(options.trackBy(node));
  const kids = options.children(node) ?? [];
  for (const child of kids) {
    for (const id of collectSubtreeIds(child, options)) {
      ids.add(id);
    }
  }
  return ids;
}

type DetachResult<T> = { found: T; roots: readonly T[] } | null;

function detachNode<T>(
  roots: readonly T[],
  targetId: string,
  options: MoveTreeNodeOptions<T>,
): DetachResult<T> {
  for (let i = 0; i < roots.length; i++) {
    const node = roots[i]!;
    if (options.trackBy(node) === targetId) {
      const next = [...roots.slice(0, i), ...roots.slice(i + 1)];
      return { found: node, roots: next };
    }
    const kids = options.children(node) ?? [];
    if (kids.length > 0) {
      const childResult = detachNode(kids, targetId, options);
      if (childResult !== null) {
        const updatedNode = options.withChildren(node, childResult.roots);
        const next = [...roots.slice(0, i), updatedNode, ...roots.slice(i + 1)];
        return { found: childResult.found, roots: next };
      }
    }
  }
  return null;
}

function insertNode<T>(
  roots: readonly T[],
  parentId: string | null,
  index: number,
  nodeToInsert: T,
  options: MoveTreeNodeOptions<T>,
): readonly T[] | null {
  if (parentId === null) {
    const clamped = Math.max(0, Math.min(index, roots.length));
    return [...roots.slice(0, clamped), nodeToInsert, ...roots.slice(clamped)];
  }
  for (let i = 0; i < roots.length; i++) {
    const node = roots[i]!;
    if (options.trackBy(node) === parentId) {
      const kids = options.children(node) ?? [];
      const clamped = Math.max(0, Math.min(index, kids.length));
      const newKids = [...kids.slice(0, clamped), nodeToInsert, ...kids.slice(clamped)];
      const updated = options.withChildren(node, newKids);
      return [...roots.slice(0, i), updated, ...roots.slice(i + 1)];
    }
    const kids = options.children(node) ?? [];
    if (kids.length > 0) {
      const result = insertNode(kids, parentId, index, nodeToInsert, options);
      if (result !== null) {
        const updated = options.withChildren(node, result);
        return [...roots.slice(0, i), updated, ...roots.slice(i + 1)];
      }
    }
  }
  return null;
}

/**
 * Applies a {@link ForTreeDragDropEvent} to a nested, consumer-owned tree, returning a new roots
 * array. Pure and immutable — never mutates `roots` or any node. Detaches `event.node` from its
 * current parent and re-inserts it (with its subtree) under `event.newParent` at
 * `event.currentIndex` (or among the roots when `newParent` is `null`). Returns a shallow copy of
 * `roots` unchanged when the move is a no-op or invalid (node not found, or `newParent` is the node
 * itself or one of its descendants).
 */
export function moveTreeNode<T>(roots: readonly T[], options: MoveTreeNodeOptions<T>): T[] {
  const { event } = options;

  const detachResult = detachNode(roots, event.node, options);
  if (detachResult === null) {
    return [...roots];
  }

  const { found, roots: rootsAfterDetach } = detachResult;

  if (event.newParent !== null) {
    const subtreeIds = collectSubtreeIds(found, options);
    if (subtreeIds.has(event.newParent)) {
      return [...roots];
    }
    if (event.newParent === event.node) {
      return [...roots];
    }
  }

  const result = insertNode(rootsAfterDetach, event.newParent, event.currentIndex, found, options);
  if (result === null) {
    return [...roots];
  }

  return result as T[];
}
