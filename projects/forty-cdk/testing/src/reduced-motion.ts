const REDUCE_QUERY = /prefers-reduced-motion:\s*reduce/i;

function installMatchMedia(stub: (query: string) => MediaQueryList): () => void {
  const target = globalThis as { matchMedia?: (query: string) => MediaQueryList };
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
 * Makes `prefers-reduced-motion: reduce` match, and returns a callback that restores the previous
 * `matchMedia`.
 *
 * jsdom has no `matchMedia` at all, so a primitive reading the preference sees no answer rather
 * than "no preference", and nothing a spec dispatches can change that. This installs one: a query
 * naming `prefers-reduced-motion: reduce` matches and every other query does not. Its listeners are
 * inert, which suits a preference read once as the fixture mounts; use
 * {@link withFlippableReducedMotion} to change it while mounted.
 *
 * Teardown is explicit, so a failing test cannot leave the stub behind for the next one:
 *
 * ```ts
 * let restore: () => void;
 * beforeEach(() => (restore = withReducedMotion()));
 * afterEach(() => restore());
 * ```
 */
export function withReducedMotion(): () => void {
  return installMatchMedia((query: string): MediaQueryList => {
    const matches = REDUCE_QUERY.test(query);
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

/** A reduced-motion preference a spec can change while a fixture is mounted. */
export interface FlippableReducedMotion {
  /**
   * Sets the preference and notifies every listener registered on the reduce query. Listeners on
   * any other query are never called.
   */
  set(matches: boolean): void;
  /** Restores the previous `matchMedia`. Call it from an `afterEach` or a `finally`. */
  restore(): void;
}

/**
 * {@link withReducedMotion} with a preference that changes while the fixture is mounted: the
 * reduce query starts at `initial`, and `set()` notifies the `change` listeners registered on it,
 * as the browser does when the user changes the setting. Use it to assert that a primitive follows
 * the preference rather than reading it once.
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
      (REDUCE_QUERY.test(query)
        ? reduced
        : {
            ...reduced,
            matches: false,
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
          }) as unknown as MediaQueryList,
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
