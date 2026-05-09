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
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */
export function withReducedMotion(): () => void {
  const target = window as unknown as {
    matchMedia?: (query: string) => MediaQueryList;
  };
  const had = 'matchMedia' in target;
  const original = target.matchMedia;

  const stub = (query: string): MediaQueryList => {
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
  };

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
