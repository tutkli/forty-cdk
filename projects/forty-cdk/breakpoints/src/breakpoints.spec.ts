import {
  Component,
  PLATFORM_ID,
  type Provider,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type ForBreakpoints, injectBreakpoints } from './breakpoints';
import { provideForBreakpointsDefaults } from './breakpoints-defaults';

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

/**
 * Fake `matchMedia` that parses the `min-width` / `max-width` bounds out of a
 * query and tracks a single simulated viewport width. `setWidth` re-evaluates
 * every registered query and dispatches a `change` to the ones that flipped.
 */
class FakeMediaEnv {
  width = 0;
  readonly mqls = new Map<string, FakeMql>();
  readonly calls: string[] = [];

  readonly matchMedia = (query: string): MediaQueryList => {
    this.calls.push(query);
    let mql = this.mqls.get(query);
    if (!mql) {
      mql = makeMql(query, this.evaluate(query));
      this.mqls.set(query, mql);
    }
    return mql as unknown as MediaQueryList;
  };

  setWidth(width: number): void {
    this.width = width;
    for (const mql of this.mqls.values()) {
      const next = this.evaluate(mql.media);
      if (next !== mql.matches) {
        mql.dispatch(next);
      }
    }
  }

  listenerCount(): number {
    let total = 0;
    for (const mql of this.mqls.values()) {
      total += mql.listeners.length;
    }
    return total;
  }

  private evaluate(query: string): boolean {
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const minOk = !min || this.width >= Number.parseFloat(min[1]!);
    const maxOk = !max || this.width <= Number.parseFloat(max[1]!);
    return minOk && maxOk;
  }
}

interface MatchMediaWindow {
  matchMedia?: (query: string) => unknown;
}

function withMatchMedia(impl: (query: string) => unknown): () => void {
  const target = window as unknown as MatchMediaWindow;
  const had = 'matchMedia' in target;
  const original = target.matchMedia;
  Object.defineProperty(target, 'matchMedia', { configurable: true, writable: true, value: impl });
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
  readonly bp = injectBreakpoints();
}

describe('injectBreakpoints', () => {
  let env: FakeMediaEnv;
  let restore: () => void = () => {};

  beforeEach(() => {
    env = new FakeMediaEnv();
    restore = withMatchMedia(env.matchMedia);
  });

  afterEach(() => {
    restore();
    TestBed.resetTestingModule();
  });

  function create(providers: Provider[] = []) {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    return TestBed.createComponent(Host);
  }

  it('up() reflects the initial match and reacts to width changes', () => {
    env.width = 800;
    const bp = create().componentInstance.bp;
    const md = bp.up('md');
    expect(md()).toBe(true);
    env.setWidth(700);
    expect(md()).toBe(false);
    env.setWidth(900);
    expect(md()).toBe(true);
  });

  it('down() matches narrower than the breakpoint with a sub-pixel back-off', () => {
    const bp = create().componentInstance.bp;
    const down = bp.down('md');
    env.setWidth(767);
    expect(down()).toBe(true);
    env.setWidth(768);
    expect(down()).toBe(false);
    expect(env.calls).toContain('(max-width: 767.98px)');
  });

  it('between() spans from min (inclusive) up to but not including max', () => {
    const bp = create().componentInstance.bp;
    const band = bp.between('sm', 'lg');
    env.setWidth(800);
    expect(band()).toBe(true);
    env.setWidth(500);
    expect(band()).toBe(false);
    env.setWidth(1024);
    expect(band()).toBe(false);
  });

  it('only() matches just the breakpoint band', () => {
    const bp = create().componentInstance.bp;
    const onlyMd = bp.only('md');
    env.setWidth(800);
    expect(onlyMd()).toBe(true);
    env.setWidth(700);
    expect(onlyMd()).toBe(false);
    env.setWidth(1100);
    expect(onlyMd()).toBe(false);
  });

  it('only() is open-ended for the largest breakpoint', () => {
    const bp = create().componentInstance.bp;
    const onlyLargest = bp.only('2xl');
    env.setWidth(2000);
    expect(onlyLargest()).toBe(true);
    env.setWidth(1000);
    expect(onlyLargest()).toBe(false);
    expect(env.calls).toContain('(min-width: 1536px)');
  });

  it('active() reports the largest matching breakpoint, reactively', () => {
    const bp = create().componentInstance.bp;
    const active = bp.active;
    env.setWidth(800);
    expect(active()).toBe('md');
    env.setWidth(500);
    expect(active()).toBeNull();
    env.setWidth(2000);
    expect(active()).toBe('2xl');
    env.setWidth(1024);
    expect(active()).toBe('lg');
  });

  it('caches one MediaQueryList per query', () => {
    const bp = create().componentInstance.bp;
    bp.up('md');
    bp.up('md');
    bp.up('md');
    expect(env.calls.filter((q) => q === '(min-width: 768px)')).toHaveLength(1);
  });

  it('throws on an unknown breakpoint name', () => {
    const bp = create().componentInstance.bp;
    expect(() => (bp as ForBreakpoints<string>).up('nope')).toThrowError(
      /\[forty-cdk\/breakpoints]/,
    );
  });

  it('reads the breakpoint map from provideForBreakpointsDefaults', () => {
    const bp = create([provideForBreakpointsDefaults({ sm: 800, md: 900 })]).componentInstance.bp;
    const sm = bp.up('sm');
    env.setWidth(850);
    expect(sm()).toBe(true);
    env.setWidth(700);
    expect(sm()).toBe(false);
    expect(env.calls).toContain('(min-width: 800px)');
    expect(() => bp.up('lg')).toThrowError(/\[forty-cdk\/breakpoints]/);
  });

  it('matches() observes an arbitrary media query', () => {
    const bp = create().componentInstance.bp;
    const wide = bp.matches('(min-width: 1000px)');
    env.setWidth(1200);
    expect(wide()).toBe(true);
    env.setWidth(800);
    expect(wide()).toBe(false);
  });

  it('returns false / null on the server platform and never touches matchMedia', () => {
    env.width = 800;
    const bp = create([{ provide: PLATFORM_ID, useValue: 'server' }]).componentInstance.bp;
    expect(bp.up('md')()).toBe(false);
    expect(bp.active()).toBeNull();
    expect(env.calls).toHaveLength(0);
    expect(env.listenerCount()).toBe(0);
  });

  it('removes listeners when the injector is destroyed', () => {
    const fixture = create();
    const bp = fixture.componentInstance.bp;
    bp.up('sm');
    bp.up('md');
    bp.active();
    expect(env.listenerCount()).toBeGreaterThan(0);
    fixture.destroy();
    expect(env.listenerCount()).toBe(0);
  });

  it('materializes active breakpoint listeners eagerly at injection time', () => {
    create();
    expect(env.listenerCount()).toBe(5);
    expect(env.calls.filter((q) => /min-width/.test(q))).toHaveLength(5);
  });

  it('reading active after the injector is destroyed neither throws nor attaches a listener', () => {
    const fixture = create();
    const bp = fixture.componentInstance.bp;
    fixture.destroy();
    expect(env.listenerCount()).toBe(0);
    expect(() => bp.active()).not.toThrow();
    expect(env.listenerCount()).toBe(0);
    expect(bp.active()).toBeNull();
  });

  it('reading active for the first time during injector destruction leaks no listener', () => {
    const fixture = create();
    const bp = fixture.componentInstance.bp;
    fixture.componentRef.onDestroy(() => {
      bp.active();
    });
    fixture.destroy();
    expect(env.listenerCount()).toBe(0);
  });
});
