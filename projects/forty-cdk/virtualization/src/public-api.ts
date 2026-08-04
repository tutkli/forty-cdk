/*
 * Public API surface of forty-cdk/virtualization.
 *
 * Virtualization (the windowing core, the Shape A viewport directives and
 * infinite-scroll) ships from this secondary entry point so that
 * `@tanstack/virtual-core` is isolated to its own bundle chunk: only consumers
 * importing from `forty-cdk/virtualization` pull it in, even when another lazy
 * route in the same app virtualizes.
 *
 * Nothing here imports another primitive, so the isolation is structural rather
 * than a tree-shaking claim. The two adapters that do compose a second primitive
 * ship from their own entry points: `forty-cdk/table-virtualization`
 * (`[forTableVirtualized]`) and `forty-cdk/virtual-reorder`
 * (`[forVirtualReorder]`).
 */

export {
  injectVirtualizer,
  type ForVirtualizer,
  type VirtualItem,
  type VirtualizerOptions,
} from './virtualizer';
export {
  injectInfiniteScroll,
  type ForInfiniteScroll,
  type InfiniteScrollOptions,
} from './infinite-scroll';
export {
  FOR_VIRTUAL_VIEWPORT_CONTEXT,
  type ForVirtualViewportContext,
} from './virtual-viewport-context';
export { ForVirtualViewport } from './virtual-viewport';
export { ForVirtualFor, type ForVirtualForContext } from './virtual-for';
