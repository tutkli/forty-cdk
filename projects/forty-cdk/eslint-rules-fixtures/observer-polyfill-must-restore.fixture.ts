/**
 * Fixture for `forty-cdk/observer-polyfill-must-restore`.
 *
 * A spec that installs a global polyfill (`globalThis.ResizeObserver = …`, or
 * `Object.defineProperty(globalThis, 'ResizeObserver', …)`) must restore it in
 * an `afterEach` / `afterAll` of the same `describe` (or an enclosing one), or
 * in the `finally` of a `try` around the install. jsdom ships no
 * `ResizeObserver`, `IntersectionObserver` or `matchMedia`, so restoring one of
 * those means deleting it: writing an `undefined` capture back leaves the key in
 * `globalThis` for the next spec file in the worker. `vi.stubGlobal` and the
 * `installObserverPolyfills()` helper in `forty-cdk/testing` both get this
 * right. See .claude/rules/testing.md § "Test isolation — non-negotiables"
 * rule 2.
 */

declare const describe: (name: string, fn: () => void) => void;
declare const beforeAll: (fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const afterAll: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const vi: { stubGlobal(name: string, value: unknown): void };
declare const stubMatchMedia: typeof matchMedia;

type Globals = {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
  MutationObserver?: unknown;
  matchMedia?: unknown;
};

class StubObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('leaky polyfill', () => {
  beforeEach(() => {
    // Expected: 1× forty-cdk/observer-polyfill-must-restore — no restore at all.
    (globalThis as Globals).ResizeObserver = StubObserver;
  });

  it('runs', () => {});
});

describe('two installs and an unrelated after hook', () => {
  beforeEach(() => {
    // Expected: 1× forty-cdk/observer-polyfill-must-restore — the first install.
    (globalThis as Globals).ResizeObserver = StubObserver;
  });

  describe('nested', () => {
    beforeEach(() => {
      // Expected: 1× forty-cdk/observer-polyfill-must-restore — a second install is not a restore.
      (globalThis as Globals).ResizeObserver = StubObserver;
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('runs', () => {});
  });
});

describe('defineProperty install', () => {
  beforeEach(() => {
    // Expected: 1× forty-cdk/observer-polyfill-must-restore — an install through `defineProperty`.
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: StubObserver,
    });
  });

  it('runs', () => {});
});

describe('unguarded write-back', () => {
  let original: typeof matchMedia;

  beforeEach(() => {
    original = globalThis.matchMedia;
    globalThis.matchMedia = stubMatchMedia;
  });

  afterEach(() => {
    // Expected: 1× forty-cdk/observer-polyfill-must-restore — writes the `undefined` capture back.
    globalThis.matchMedia = original;
  });

  it('runs', () => {});
});

// Allowed: `vi.stubGlobal`, which the setup file unstubs after every test.
describe('stubbed global', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StubObserver);
  });

  it('runs', () => {});
});

// Allowed: an install deleted again in `afterAll`.
describe('deleted in afterAll', () => {
  beforeAll(() => {
    (globalThis as Globals).ResizeObserver = StubObserver;
  });

  afterAll(() => {
    delete (globalThis as Globals).ResizeObserver;
  });

  it('runs', () => {});
});

// Allowed: an install inside a test, restored by an enclosing describe's `afterEach`.
describe('restored by the enclosing describe', () => {
  afterEach(() => {
    delete (globalThis as Globals).ResizeObserver;
  });

  describe('nested', () => {
    it('installs inline', () => {
      (globalThis as Globals).ResizeObserver = undefined;
    });
  });
});

// Allowed: a write-back guarded by an existence check whose other branch deletes.
describe('guarded write-back', () => {
  let hadMatchMedia: boolean;
  let original: typeof matchMedia;

  beforeEach(() => {
    hadMatchMedia = 'matchMedia' in globalThis;
    original = globalThis.matchMedia;
    globalThis.matchMedia = stubMatchMedia;
  });

  afterEach(() => {
    if (hadMatchMedia) {
      globalThis.matchMedia = original;
    } else {
      delete (globalThis as Globals).matchMedia;
    }
  });

  it('runs', () => {});
});

// Allowed: jsdom ships `MutationObserver`, so the captured original is defined.
describe('a global jsdom ships', () => {
  let original: typeof MutationObserver;

  beforeEach(() => {
    original = globalThis.MutationObserver;
    (globalThis as Globals).MutationObserver = StubObserver;
  });

  afterEach(() => {
    globalThis.MutationObserver = original;
  });

  it('runs', () => {});
});

// Allowed: an install restored by the `finally` of a `try` around it.
describe('try / finally', () => {
  it('restores in `finally`', () => {
    try {
      (globalThis as Globals).IntersectionObserver = StubObserver;
    } finally {
      delete (globalThis as Globals).IntersectionObserver;
    }
  });
});
