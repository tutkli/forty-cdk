/** Emitted by `[forTreeNodeDrag]` on a committed move. Carries the tree's string node values. */
export interface ForTreeDragDropEvent {
  /** The moved node's value. */
  readonly node: string;
  /** The node's parent value before the move, or `null` if it was a root node. */
  readonly previousParent: string | null;
  /** The node's parent value after the move, or `null` if dropped at the root level. */
  readonly newParent: string | null;
  /** The node's index among its previous parent's children. */
  readonly previousIndex: number;
  /** The node's index among its new parent's children, post-removal. */
  readonly currentIndex: number;
}
