/*
 * Public API surface of forty-cdk/virtual-reorder.
 *
 * The `[forVirtualReorder]` adapter ships from its own secondary entry point
 * because it composes two primitives: it pins and scrolls through
 * `forty-cdk/virtualization`'s viewport and wraps `forty-cdk/drag-drop`'s
 * `[forDropList]`. Keeping it here is what lets `forty-cdk/virtualization` stay
 * free of any other primitive's module graph, so a consumer who only windows a
 * list never resolves the drag-drop entry point.
 */

export { ForVirtualReorder, type ForVirtualReorderEvent } from './virtual-reorder';
