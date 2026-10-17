/**
 * Fixture for `forty-cdk/scoped-fake-timers`.
 *
 * Every `vi.useFakeTimers(…)` must be undone by a `vi.useRealTimers()` that
 * still runs when a test throws: an `afterEach` / `afterAll` of the same scope
 * for an install in a `before*` hook (a `describe`, or the file for a file-level
 * hook), an `afterEach` / `afterAll` of an enclosing `describe` or of the file
 * for an install inside an `it` / `test`, or the `finally` of a `try` around the
 * install. An inline restore at the end of an `it` leaks if the test throws
 * first, and every later test in the worker inherits the fake clock. See
 * .claude/rules/testing.md § "Test isolation — non-negotiables" rule 1.
 */

declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void) => void;
declare const vi: {
  useFakeTimers(options?: { toFake?: string[] }): void;
  useRealTimers(): void;
  advanceTimersByTime(ms: number): void;
};

// Expected: 1× forty-cdk/scoped-fake-timers — a file-level hook with no file-level restore.
beforeEach(() => {
  vi.useFakeTimers();
});

describe('unpaired fake timers', () => {
  // Expected: 1× forty-cdk/scoped-fake-timers — the bare install.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('does timer-y things', () => {
    vi.advanceTimersByTime(10);
  });
});

describe('unpaired options form', () => {
  // Expected: 1× forty-cdk/scoped-fake-timers — the options form.
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));

  it('reads the clock', () => {
    vi.advanceTimersByTime(10);
  });
});

describe('inline installs', () => {
  it('restores on its last line', () => {
    // Expected: 1× forty-cdk/scoped-fake-timers — an install inside an `it`, restored inline.
    vi.useFakeTimers();
    vi.advanceTimersByTime(10);
    vi.useRealTimers();
  });

  test('the `test` alias', () => {
    // Expected: 1× forty-cdk/scoped-fake-timers — the same install under `test`.
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    vi.useRealTimers();
  });
});

// Allowed: install and restore paired in the same describe, options form included,
// and installs inside an `it` restored by the describe or by an enclosing one.
describe('paired', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('installs inline too', () => {
    vi.useFakeTimers();
  });

  describe('nested', () => {
    it('is restored by the enclosing describe', () => {
      vi.useFakeTimers();
    });
  });
});

describe('try / finally', () => {
  it('restores in `finally`', () => {
    try {
      vi.useFakeTimers();
      vi.advanceTimersByTime(10);
    } finally {
      vi.useRealTimers();
    }
  });
});
