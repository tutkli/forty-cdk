import { Component, PLATFORM_ID, type Signal, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { injectMediaQuery, injectPrefersReducedMotion } from './media-query';

interface FakeMql {
  matches: boolean;
  media: string;
  listeners: Array<(event: { matches: boolean }) => void>;
  addEventListener(type: 'change', l: (event: { matches: boolean }) => void): void;
  removeEventListener(type: 'change', l: (event: { matches: boolean }) => void): void;
  dispatch(matches: boolean): void;
}

function makeMql(query: string, matches: boolean): FakeMql {
  return {
    matches,
    media: query,
    listeners: [],
    addEventListener(_type, l) {
      this.listeners.push(l);
    },
    removeEventListener(_type, l) {
      this.listeners = this.listeners.filter((x) => x !== l);
    },
    dispatch(next) {
      this.matches = next;
      for (const l of this.listeners) {
        l({ matches: next });
      }
    },
  };
}

interface MatchMediaWindow {
  matchMedia?: (query: string) => unknown;
}

function withMatchMedia(impl: (query: string) => unknown): () => void {
  const target = window as unknown as MatchMediaWindow;
  const had = 'matchMedia' in target;
  const original = target.matchMedia;
  Object.defineProperty(target, 'matchMedia', {
    configurable: true,
    writable: true,
    value: impl,
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

@Component({ template: `` })
class Host {
  readonly value: Signal<boolean>;
  constructor() {
    this.value = injectMediaQuery('(max-width: 600px)');
  }
}

@Component({ template: `` })
class ReducedMotionHost {
  readonly value: Signal<boolean>;
  constructor() {
    this.value = injectPrefersReducedMotion();
  }
}

describe('injectMediaQuery', () => {
  let restore: () => void = () => {};
  let mql: FakeMql;

  beforeEach(() => {
    mql = makeMql('(max-width: 600px)', false);
    restore = withMatchMedia((query) => {
      mql.media = query;
      return mql as unknown as MediaQueryList;
    });
  });

  afterEach(() => {
    restore();
    TestBed.resetTestingModule();
  });

  it('reflects the initial match state', () => {
    mql.matches = true;
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    expect(fixture.componentInstance.value()).toBe(true);
  });

  it('updates the signal when the media query changes', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    expect(fixture.componentInstance.value()).toBe(false);
    mql.dispatch(true);
    expect(fixture.componentInstance.value()).toBe(true);
    mql.dispatch(false);
    expect(fixture.componentInstance.value()).toBe(false);
  });

  it('removes the listener on DestroyRef.onDestroy', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    expect(mql.listeners).toHaveLength(1);
    fixture.destroy();
    expect(mql.listeners).toHaveLength(0);
  });

  it('returns signal(false) on the server platform', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const fixture = TestBed.createComponent(Host);
    expect(fixture.componentInstance.value()).toBe(false);
    // Even though our matchMedia stub exists, the helper short-circuits on
    // non-browser platforms, so no listener should be registered.
    expect(mql.listeners).toHaveLength(0);
  });

  it('returns signal(false) when matchMedia is unavailable', () => {
    restore();
    restore = withMatchMedia(undefined as unknown as (q: string) => unknown);
    // Wipe matchMedia outright.
    const target = window as unknown as MatchMediaWindow;
    delete target.matchMedia;

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    expect(fixture.componentInstance.value()).toBe(false);
  });
});

describe('injectPrefersReducedMotion', () => {
  let restore: () => void = () => {};

  afterEach(() => {
    restore();
    TestBed.resetTestingModule();
  });

  it('uses the prefers-reduced-motion: reduce query', () => {
    let askedQuery: string | null = null;
    restore = withMatchMedia((query) => {
      askedQuery = query;
      return makeMql(query, true) as unknown as MediaQueryList;
    });

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ReducedMotionHost);
    expect(fixture.componentInstance.value()).toBe(true);
    expect(askedQuery).toBe('(prefers-reduced-motion: reduce)');
  });
});
