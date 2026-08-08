/**
 * Emitted by `[forTreeNodeDrag]` on a committed move. Carries the tree's node values,
 * generic over their type `T` (default `string`, matching `ForTree`'s own default).
 */
export interface ForTreeDragDropEvent<T = string> {
  /** The moved node's value. */
  readonly node: T;
  /** The node's parent value before the move, or `null` if it was a root node. */
  readonly previousParent: T | null;
  /** The node's parent value after the move, or `null` if dropped at the root level. */
  readonly newParent: T | null;
  /** The node's index among its previous parent's children. */
  readonly previousIndex: number;
  /** The node's index among its new parent's children, post-removal. */
  readonly currentIndex: number;
}
