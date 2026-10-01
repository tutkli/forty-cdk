import { installObserverPolyfills } from './observers';

type ObserverGlobals = {
  ResizeObserver?: typeof ResizeObserver;
  IntersectionObserver?: typeof IntersectionObserver;
};

const globals = globalThis as ObserverGlobals;

describe('installObserverPolyfills', () => {
  it('starts from an environment that ships neither observer', () => {
    expect('ResizeObserver' in globalThis).toBe(false);
    expect('IntersectionObserver' in globalThis).toBe(false);
  });

  it('installs inert constructors and deletes them again on restore', () => {
    const restore = installObserverPolyfills();
    const element = document.createElement('div');
    const callback = vi.fn();

    try {
      const resize = new ResizeObserver(callback);
      resize.observe(element);
      resize.disconnect();
      const intersection = new IntersectionObserver(callback);
      intersection.observe(element);
      expect(intersection.takeRecords()).toEqual([]);
      intersection.disconnect();
      expect(callback).not.toHaveBeenCalled();
    } finally {
      restore();
    }

    expect('ResizeObserver' in globalThis).toBe(false);
    expect('IntersectionObserver' in globalThis).toBe(false);
  });

  it('leaves a usable constructor in place, and restores exactly that one', () => {
    class FakeResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    const restore = installObserverPolyfills();
    expect(globals.ResizeObserver).toBe(FakeResizeObserver);
    expect(typeof globals.IntersectionObserver).toBe('function');
    restore();

    expect(globals.ResizeObserver).toBe(FakeResizeObserver);
    expect('IntersectionObserver' in globalThis).toBe(false);
  });

  it('replaces a global left present but undefined', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    const restore = installObserverPolyfills();
    expect(typeof globals.ResizeObserver).toBe('function');
    restore();

    expect('ResizeObserver' in globalThis).toBe(false);
  });
});
