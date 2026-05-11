/**
 * Fixture for `forty-cdk/scoped-fake-timers` (warn, not error).
 *
 * `vi.useFakeTimers()` in a `before*` hook must be paired with
 * `vi.useRealTimers()` in a sibling `after*` hook of the same `describe`.
 * An inline restore at the end of an `it` leaks if the test throws first.
 * See CLAUDE.md > Testing notes > Test isolation — non-negotiables > rule 1.
 *
 * The `beforeEach` below installs fake timers but the describe has no
 * `afterEach`/`afterAll` calling `vi.useRealTimers()`, so the rule warns.
 */

declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const vi: {
  useFakeTimers(): void;
  useRealTimers(): void;
};

describe('unpaired fake timers', () => {
  beforeEach(() => {
    // Expected: 1× forty-cdk/scoped-fake-timers (warning)
    vi.useFakeTimers();
  });
  // No afterEach / afterAll calling vi.useRealTimers() — the install leaks.

  it('does timer-y things', () => {
    /* … */
  });
});
