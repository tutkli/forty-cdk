import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { VisibilityPause } from './visibility-pause';

describe('VisibilityPause', () => {
  let pause: VisibilityPause;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  function visibilityListenerCalls(spy: ReturnType<typeof vi.spyOn>): number {
    return spy.mock.calls.filter((args: unknown[]) => args[0] === 'visibilitychange')
      .length;
  }

  function setVisibility(state: 'visible' | 'hidden'): void {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    addSpy = vi.spyOn(document, 'addEventListener');
    removeSpy = vi.spyOn(document, 'removeEventListener');
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    pause = TestBed.inject(VisibilityPause);
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    TestBed.resetTestingModule();
  });

  it('attaches the document listener on the first subscribe', () => {
    expect(visibilityListenerCalls(addSpy)).toBe(0);
    pause.subscribe(() => {});
    expect(visibilityListenerCalls(addSpy)).toBe(1);
  });

  it('detaches the document listener on the last unsubscribe', () => {
    const unsubscribe = pause.subscribe(() => {});
    expect(visibilityListenerCalls(removeSpy)).toBe(0);
    unsubscribe();
    expect(visibilityListenerCalls(removeSpy)).toBe(1);
  });

  it('refcounts: a second subscriber does not re-attach, and the listener detaches only on the final unsubscribe', () => {
    const first = pause.subscribe(() => {});
    const second = pause.subscribe(() => {});
    // Only the first subscribe attaches the DOM listener.
    expect(visibilityListenerCalls(addSpy)).toBe(1);

    first();
    // One subscriber remains, so the listener stays attached.
    expect(visibilityListenerCalls(removeSpy)).toBe(0);

    second();
    // Last subscriber gone — the listener detaches exactly once.
    expect(visibilityListenerCalls(removeSpy)).toBe(1);
  });

  it('extra unsubscribe calls are idempotent no-ops', () => {
    const unsubscribe = pause.subscribe(() => {});
    unsubscribe();
    expect(visibilityListenerCalls(removeSpy)).toBe(1);

    // A second invocation of the same handle must not detach again, must not
    // throw, and must not corrupt the refcount for surviving subscribers.
    expect(() => unsubscribe()).not.toThrow();
    expect(visibilityListenerCalls(removeSpy)).toBe(1);
  });

  it('a double-unsubscribe does not decrement the count for another live subscriber', () => {
    const first = pause.subscribe(() => {});
    const second = pause.subscribe(() => {});

    first();
    first();
    // The stale second call must not have detached the listener that the
    // still-live `second` subscriber depends on.
    expect(visibilityListenerCalls(removeSpy)).toBe(0);

    second();
    expect(visibilityListenerCalls(removeSpy)).toBe(1);
  });

  it('re-attaches a fresh listener after the refcount drops back to zero', () => {
    const first = pause.subscribe(() => {});
    expect(visibilityListenerCalls(addSpy)).toBe(1);
    first();
    expect(visibilityListenerCalls(removeSpy)).toBe(1);

    const second = pause.subscribe(() => {});
    // Dropping to zero and subscribing again attaches a brand-new listener.
    expect(visibilityListenerCalls(addSpy)).toBe(2);
    second();
    expect(visibilityListenerCalls(removeSpy)).toBe(2);
  });

  it('delivers true when the page hides and false when it becomes visible again', () => {
    const seen: boolean[] = [];
    pause.subscribe((hidden) => seen.push(hidden));

    setVisibility('hidden');
    setVisibility('visible');

    expect(seen).toEqual([true, false]);
  });

  it('does not invoke subscribers synchronously on subscribe', () => {
    setVisibility('hidden');

    const seen: boolean[] = [];
    pause.subscribe((hidden) => seen.push(hidden));

    // subscribe only registers for future transitions; it never replays the
    // current state synchronously.
    expect(seen).toEqual([]);
  });

  it('fans a single transition out to every live subscriber', () => {
    const a: boolean[] = [];
    const b: boolean[] = [];
    pause.subscribe((hidden) => a.push(hidden));
    pause.subscribe((hidden) => b.push(hidden));

    setVisibility('hidden');

    expect(a).toEqual([true]);
    expect(b).toEqual([true]);
  });

  it('stops delivering to a subscriber after it unsubscribes', () => {
    const seen: boolean[] = [];
    const unsubscribe = pause.subscribe((hidden) => seen.push(hidden));

    setVisibility('hidden');
    unsubscribe();
    setVisibility('visible');

    expect(seen).toEqual([true]);
  });

  it('currentlyHidden reflects the live document visibility state', () => {
    setVisibility('visible');
    expect(pause.currentlyHidden()).toBe(false);
    setVisibility('hidden');
    expect(pause.currentlyHidden()).toBe(true);
  });

  describe('server platform (SSR)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      addSpy.mockClear();
      removeSpy.mockClear();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      pause = TestBed.inject(VisibilityPause);
    });

    it('subscribe is a no-op that never attaches a listener', () => {
      const seen: boolean[] = [];
      const unsubscribe = pause.subscribe((hidden) => seen.push(hidden));

      expect(visibilityListenerCalls(addSpy)).toBe(0);
      // Even if a visibilitychange fires, no subscriber is invoked.
      setVisibility('hidden');
      expect(seen).toEqual([]);

      // The returned unsubscribe is a safe no-op.
      expect(() => unsubscribe()).not.toThrow();
      expect(visibilityListenerCalls(removeSpy)).toBe(0);
    });

    it('currentlyHidden returns false on the server', () => {
      setVisibility('hidden');
      expect(pause.currentlyHidden()).toBe(false);
    });
  });

  it('isolates the subscriber set across application bootstraps', () => {
    const first = pause.subscribe(() => {});
    expect(visibilityListenerCalls(addSpy)).toBe(1);

    // Tearing down the injector destroys the previous VisibilityPause
    // instance (detaching its listener) and its subscriber set. A leftover
    // unsubscribe handle from the old instance must not affect the new one.
    TestBed.resetTestingModule();
    expect(visibilityListenerCalls(removeSpy)).toBe(1);
    addSpy.mockClear();
    removeSpy.mockClear();

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fresh = TestBed.inject(VisibilityPause);

    fresh.subscribe(() => {});
    expect(visibilityListenerCalls(addSpy)).toBe(1);
    // The stale handle from the destroyed instance is inert.
    expect(() => first()).not.toThrow();
    expect(visibilityListenerCalls(removeSpy)).toBe(0);
  });
});
