/**
 * Permanent smoke test that the mock-reset invariants are wired up.
 *
 * The two `it()` blocks below share a module-scoped `vi.fn()`. With either
 * the repo-root `vitest.config.ts` OR the `vitest-invariants-setup.ts` setup
 * file taking effect (see `angular.json`), the spy's call history is reset
 * between tests, so each test observes an empty `mock.calls` on entry.
 * Without either layer wired, whichever block runs second observes the call
 * recorded by the first and its entry assertion fails — turning a
 * misconfiguration into a loud test failure instead of silent state leakage.
 *
 * Both blocks are deliberately **symmetric** (assert-empty → record →
 * assert-recorded) rather than a record-then-observe pair. The nightly
 * scheduler-hostile profile shuffles tests within a file
 * (`sequence.shuffle.tests`, see `.claude/rules/testing.md`), so an
 * asymmetric pair detects the leak only in one of the two orders: the
 * observe-only block running first would see an empty history for the
 * trivial reason that nothing had run yet, and report green on a broken
 * configuration. Symmetry makes the detection order-independent.
 *
 * Kept as a permanent guard rather than a one-shot scratch test (deviates
 * from the issue's "documented then removed" wording): future contributors
 * can verify the wiring at a glance, and any regression in the builder
 * option or the setup-file wiring trips here first.
 */
import { vi } from 'vitest';

const spy = vi.fn();

describe('vitest mock-reset invariants', () => {
  it('starts with a clean history and records calls within a single test', () => {
    expect(spy).toHaveBeenCalledTimes(0);
    spy('first');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('clears mock history between tests', () => {
    expect(spy).toHaveBeenCalledTimes(0);
    spy('second');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
