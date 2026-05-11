/**
 * Fixture for `forty-cdk/observer-polyfill-must-restore`.
 *
 * A spec that installs a global polyfill (`globalThis.ResizeObserver = …`)
 * must restore it — either via an `afterAll` that `delete`s the global, or
 * via a paired `beforeEach`/`afterEach` capture-restore. The
 * `installObserverPolyfills()` helper in `test-utils/observers.ts` already
 * does this. See CLAUDE.md > Testing notes > Test isolation —
 * non-negotiables > rule 2.
 *
 * The install below has no corresponding `afterAll` or `afterEach` restore,
 * so the rule fires.
 */

declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;

class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('leaky polyfill', () => {
  beforeEach(() => {
    // Expected: 1× forty-cdk/observer-polyfill-must-restore
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = StubResizeObserver;
  });

  it('runs', () => {
    /* no afterEach / afterAll — the polyfill leaks across files. */
  });
});
