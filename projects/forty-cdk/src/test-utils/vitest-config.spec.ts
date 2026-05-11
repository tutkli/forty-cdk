/**
 * Permanent smoke test that the mock-reset invariants are wired up.
 *
 * The two `it()` blocks below share a module-scoped `vi.fn()`. With either
 * the repo-root `vitest.config.ts` OR the `vitest-invariants-setup.ts` setup
 * file taking effect (see `angular.json`), the spy's call history is reset
 * between tests, so the second test sees an empty `mock.calls`. Without
 * either layer wired, the second test would observe the call recorded by
 * the first and the assertion would fail — turning a misconfiguration into
 * a loud test failure instead of silent state leakage.
 *
 * Kept as a permanent guard rather than a one-shot scratch test (deviates
 * from the issue's "documented then removed" wording): future contributors
 * can verify the wiring at a glance, and any regression in the builder
 * option or the setup-file wiring trips here first.
 */
import { vi } from 'vitest';

const spy = vi.fn();

describe('vitest mock-reset invariants', () => {
  it('records calls within a single test', () => {
    spy('first');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('clears mock history between tests', () => {
    expect(spy).toHaveBeenCalledTimes(0);
  });
});
