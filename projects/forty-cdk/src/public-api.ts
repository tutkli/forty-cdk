/*
 * Public API surface of forty-cdk.
 *
 * The library ships a single entry point. Each primitive is a small set of
 * standalone directives — combined with `"sideEffects": false`, importing
 * only what you use is enough for tree-shakers to drop the rest. Per-primitive
 * secondary entry points can be added later if real bundles ever need them.
 */

export * from './lib/disclosure';
