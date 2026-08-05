/**
 * Installs a `window.matchMedia` stub for the duration of a test and returns a
 * callback that restores the previous global. jsdom does not implement
 * `matchMedia` at all, so the shim is part of the job rather than an override of
 * one.
 *
 * Shared by both helpers below so the restore bookkeeping is written once.
 */
function installMatchMedia(stub: (query: string) => MediaQueryList): () => void {
  const target = window as unknown as {
    matchMedia?: (query: string) => MediaQueryList;
  };
  const had = 'matchMedia' in target;
  const original = target.matchMedia;

  Object.defineProperty(target, 'matchMedia', {
    configurable: true,
    writable: true,
    value: stub,
  });

  return () => {
    if (had) {
      Object.defineProperty(target, 'matchMedia', {
        configurable: true,
        writable: true,
        value: original,
      });
    } else {
      delete target.matchMedia;
    }
  };
}

/**
 * Stub `window.matchMedia` so any query containing `prefers-reduced-motion: reduce`
 * resolves to `matches: true`. Other queries resolve to `matches: false`.
 *
 * jsdom does not implement `matchMedia` at all, so this helper is also
 * responsible for installing a usable shim for the duration of the test.
 *
 * Returns a cleanup callback that restores the previous global. The helper
 * deliberately does NOT auto-register cleanup via `afterEach` — keep teardown
 * explicit so a misbehaving test can't silently leak the stub into the next
 * one. Idiomatic usage pairs it with a `beforeEach` / `afterEach` block:
 *
 *   describe('prefers-reduced-motion: reduce', () => {
 *     let restore: () => void;
 *     beforeEach(() => {
 *       restore = withReducedMotion();
 *     });
 *     afterEach(() => {
 *       restore();
 *     });
 *     // ...
 *   });
 *
 * The listeners it hands out are inert, which is enough for a preference read
 * once at construction. Use {@link withFlippableReducedMotion} when the test
 * needs the preference to change while the fixture is mounted.
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */
export function withReducedMotion(): () => void {
  return installMatchMedia((query: string): MediaQueryList => {
    const matches = /prefers-reduced-motion:\s*reduce/i.test(query);
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    } as MediaQueryList;
  });
}

/** A reduced-motion stub whose preference can change while a fixture is mounted. */
export interface FlippableReducedMotion {
  /**
   * Flips the preference and notifies the listeners the primitive installed, so
   * a signal fed by `injectPrefersReducedMotion()` sees the new value.
   */
  set(matches: boolean): void;
  /** Restores the previous global. Call it from an `afterEach` or a `finally`. */
  restore(): void;
}

/**
 * {@link withReducedMotion} with live listeners: the reduce query resolves to
 * `initial` and `set()` re-emits to whatever registered, which is what a test
 * asserting on the *transition* needs — that a primitive gating motion on the
 * preference picks up a flip rather than reading it once at construction.
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */
export function withFlippableReducedMotion(initial = true): FlippableReducedMotion {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const reduced = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  };

  const restore = installMatchMedia(
    (query: string): MediaQueryList =>
      (/prefers-reduced-motion:\s*reduce/i.test(query)
        ? reduced
        : { ...reduced, matches: false }) as unknown as MediaQueryList,
  );

  return {
    set: (matches: boolean) => {
      reduced.matches = matches;
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
    restore,
  };
}
