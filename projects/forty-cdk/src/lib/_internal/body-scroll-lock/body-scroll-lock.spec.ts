import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BodyScrollLock } from './body-scroll-lock';

describe('BodyScrollLock', () => {
  let lock: BodyScrollLock;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    lock = TestBed.inject(BodyScrollLock);
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    TestBed.resetTestingModule();
  });

  it('sets overflow:hidden on the first lock', () => {
    expect(document.body.style.overflow).toBe('');
    lock.lock();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('clears the inline overflow style on the last unlock', () => {
    // Pre-lock inline value is intentionally NOT preserved: the lock
    // clears the inline style on unlock and lets the cascade take over.
    document.body.style.overflow = 'auto';
    lock.lock();
    expect(document.body.style.overflow).toBe('hidden');
    lock.unlock();
    expect(document.body.style.overflow).toBe('');
  });

  it('refcounts: nested locks only clear on final unlock', () => {
    lock.lock();
    lock.lock();
    expect(document.body.style.overflow).toBe('hidden');

    lock.unlock();
    expect(document.body.style.overflow).toBe('hidden');

    lock.unlock();
    expect(document.body.style.overflow).toBe('');
  });

  it('extra unlock calls are no-ops', () => {
    expect(() => lock.unlock()).not.toThrow();
    expect(document.body.style.overflow).toBe('');
  });

  it('clears the inline padding-right style on unlock', () => {
    lock.lock();
    lock.unlock();
    expect(document.body.style.paddingRight).toBe('');
  });

  it('clears (does not restore) a pre-existing padding-right inline style on unlock', () => {
    // Same rationale as overflow: the lock owns the inline style only
    // while it exists; on unlock we clear and let the cascade take over.
    document.body.style.paddingRight = '24px';
    lock.lock();
    lock.unlock();
    expect(document.body.style.paddingRight).toBe('');
  });

  it('does not restore a stale captured overflow value on unlock (regression #149)', () => {
    // Pre-lock inline value 'auto' is the value the old implementation
    // would snapshot. Under the "clear, don't restore" contract we drop
    // the inline style on the final unlock and let the cascade take over,
    // so the final state is '' — emphatically NOT the stale 'auto'.
    document.body.style.overflow = 'auto';

    lock.lock();
    expect(document.body.style.overflow).toBe('hidden');

    // External code (route transition, app-level scroll manager, …) writes
    // its own value while the lock is active. The old implementation would
    // silently clobber this on unlock by writing back the stale 'auto'.
    document.body.style.overflow = 'scroll';

    lock.unlock();

    // Bug-fix invariant: the lock did not write 'auto' back over the
    // intervening mutation. Final state is '' (cascade wins) — not the
    // stale captured value.
    expect(document.body.style.overflow).not.toBe('auto');
    expect(document.body.style.overflow).toBe('');
  });

  it('does not restore a stale captured padding-right value on unlock (regression #149)', () => {
    document.body.style.paddingRight = '24px';

    lock.lock();
    document.body.style.paddingRight = '32px';
    lock.unlock();

    // The old implementation would write back '24px'; the new contract
    // clears unconditionally and lets the cascade take over.
    expect(document.body.style.paddingRight).not.toBe('24px');
    expect(document.body.style.paddingRight).toBe('');
  });

  describe('no classic scrollbar (scrollbarWidth === 0)', () => {
    let innerWidthDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
      // jsdom reports documentElement.clientWidth === 0 and innerWidth === 1024,
      // which is the classic-scrollbar path. Force innerWidth to match
      // clientWidth so `innerWidth - clientWidth === 0`, modelling an
      // overlay-scrollbar / mobile platform with no classic scrollbar.
      innerWidthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        get: () => document.documentElement.clientWidth,
      });
    });

    afterEach(() => {
      if (innerWidthDescriptor) {
        Object.defineProperty(window, 'innerWidth', innerWidthDescriptor);
      } else {
        delete (window as unknown as Record<string, unknown>)['innerWidth'];
      }
    });

    it('does not write padding-right on lock', () => {
      lock.lock();
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.paddingRight).toBe('');
    });

    it('leaves a pre-existing inline padding-right untouched on unlock', () => {
      document.body.style.paddingRight = '24px';
      lock.lock();
      expect(document.body.style.paddingRight).toBe('24px');
      lock.unlock();
      expect(document.body.style.paddingRight).toBe('24px');
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('scrollbar-gutter: stable', () => {
    afterEach(() => {
      document.documentElement.style.removeProperty('scrollbar-gutter');
      document.body.style.removeProperty('scrollbar-gutter');
    });

    it('does not write padding-right when the gutter is reserved on <html>', () => {
      document.documentElement.style.setProperty('scrollbar-gutter', 'stable');
      lock.lock();
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.paddingRight).toBe('');
    });

    it('does not double-pad when the gutter is "stable both-edges"', () => {
      document.documentElement.style.setProperty('scrollbar-gutter', 'stable both-edges');
      lock.lock();
      expect(document.body.style.paddingRight).toBe('');
    });

    it('honors the gutter when set on <body> instead of <html>', () => {
      document.body.style.setProperty('scrollbar-gutter', 'stable');
      lock.lock();
      expect(document.body.style.paddingRight).toBe('');
      lock.unlock();
    });

    it('leaves a pre-existing inline padding-right untouched on unlock under a stable gutter', () => {
      document.documentElement.style.setProperty('scrollbar-gutter', 'stable');
      document.body.style.paddingRight = '24px';
      lock.lock();
      expect(document.body.style.paddingRight).toBe('24px');
      lock.unlock();
      expect(document.body.style.paddingRight).toBe('24px');
    });
  });

  it('isolates state across application bootstraps', () => {
    lock.lock();
    expect(document.body.style.overflow).toBe('hidden');

    // Tearing down the injector blows away the previous BodyScrollLock
    // instance (and its counter). The next bootstrap starts fresh.
    document.body.style.overflow = '';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fresh = TestBed.inject(BodyScrollLock);

    fresh.lock();
    expect(document.body.style.overflow).toBe('hidden');
    fresh.unlock();
    expect(document.body.style.overflow).toBe('');
  });
});
