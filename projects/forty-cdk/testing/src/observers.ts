/**
 * Installs inert `ResizeObserver` and `IntersectionObserver` stubs where the environment has no
 * usable constructor, and returns a callback that restores the previous globals.
 *
 * jsdom ships neither. Carousel, Table and ScrollArea measure their pieces with a `ResizeObserver`
 * as they mount, so a spec rendering a carousel viewport, a table header row (every
 * `<for-table-body>` stamps one) or a scroll area scrollbar fails with
 * `ResizeObserver is not defined` without it. No primitive constructs an `IntersectionObserver`;
 * that stub is there for your own code. The stubs observe nothing and never call back.
 *
 * A constructor already present is left alone, and the restore puts back exactly what was there,
 * deleting the global when there was none. Pair the two around the spec file, so a stub never
 * leaks into a later file sharing the worker:
 *
 * ```ts
 * let restoreObservers: () => void;
 * beforeAll(() => (restoreObservers = installObserverPolyfills()));
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
