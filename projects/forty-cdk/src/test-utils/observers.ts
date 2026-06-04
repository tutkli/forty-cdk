/**
 * Test-only polyfills for `ResizeObserver` / `IntersectionObserver`.
 *
 * jsdom 28 still does not ship these globals, but several primitives
 * (floating-ui's `autoUpdate`, item-aligned positioner, etc.) call them
 * during construction. The Vitest layer asserts wiring, so a no-op stub
 * is enough — but the stub MUST be installed only for the duration of
 * the spec file and torn down afterwards. Otherwise, when Vitest shares
 * a worker between spec files (`pool: 'forks'` or `isolate: false`), the
 * polyfill leaks across files and downstream specs that capture
 * `globalThis.ResizeObserver` in their own `beforeEach` capture the
 * polyfill as "original", silently turning their restore into a no-op
 * and leaving the stub installed for the rest of the worker.
 *
 * Symmetrically, a sibling spec that swaps in its own fake observer and
 * restores it by assignment (`globalThis.ResizeObserver = original`) leaves
 * the key present-but-`undefined` once `original` was itself absent — so a
 * mere `'ResizeObserver' in globalThis` presence check would treat that
 * leaked `undefined` as a real global and skip the stub, surfacing
 * `ResizeObserver is not a constructor` when a primitive then constructs one.
 * The guard therefore checks for a usable constructor (`typeof === 'function'`),
 * not just key presence, and the teardown restores the exact prior value.
 *
 * Usage:
 * ```ts
 * let restoreObservers: () => void;
 * beforeAll(() => {
 *   restoreObservers = installObserverPolyfills();
 * });
 * afterAll(() => restoreObservers());
 * ```
 */
export function installObserverPolyfills(): () => void {
  const g = globalThis as {
    ResizeObserver?: typeof ResizeObserver;
    IntersectionObserver?: typeof IntersectionObserver;
  };

  const hadUsableRO = typeof g.ResizeObserver === 'function';
  const originalRO = g.ResizeObserver;
  if (!hadUsableRO) {
    g.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  }

  const hadUsableIO = typeof g.IntersectionObserver === 'function';
  const originalIO = g.IntersectionObserver;
  if (!hadUsableIO) {
    g.IntersectionObserver = class {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds: readonly number[] = [];
      constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  }

  return () => {
    if (hadUsableRO) {
      g.ResizeObserver = originalRO;
    } else {
      delete g.ResizeObserver;
    }
    if (hadUsableIO) {
      g.IntersectionObserver = originalIO;
    } else {
      delete g.IntersectionObserver;
    }
  };
}
