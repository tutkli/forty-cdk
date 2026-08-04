/*
 * Public API surface of forty-cdk/table-virtualization.
 *
 * The `[forTableVirtualized]` adapter ships from its own secondary entry point
 * because it composes two primitives: it reads the table's context and
 * registration surface from `forty-cdk/table` and builds its window with
 * `forty-cdk/virtualization`. Keeping it here is what lets `forty-cdk/virtualization`
 * stay free of any other primitive's module graph, so a consumer virtualizing a
 * plain list never resolves the table entry point.
 */

export { ForTableVirtualized } from './table-virtualized';
