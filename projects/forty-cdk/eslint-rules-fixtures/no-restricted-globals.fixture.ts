/**
 * Fixture for the config-level `no-restricted-globals` bans in `eslint.config.js`.
 *
 * Library code reaches the document through `inject(DOCUMENT)` so it renders
 * under `provideServerRendering()`. The fixtures override switches the rule
 * off for this directory, so this fixture is
 * Linted as `projects/forty-cdk/core/src/no-restricted-globals.ts`
 * under the real config instead.
 */

// Expected: 1× no-restricted-globals — `document`.
export const body = document.body;

// Expected: 1× no-restricted-globals — `window`.
export const width = window.innerWidth;

// Allowed: the view reached from an injected document.
export function widthOf(doc: Document): number {
  return doc.defaultView?.innerWidth ?? 0;
}
