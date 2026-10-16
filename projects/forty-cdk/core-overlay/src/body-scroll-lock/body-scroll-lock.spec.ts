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

  function modelClientWidth(
    el: HTMLElement,
    widths: { scrolling: number; locked: number },
    lockedBy: HTMLElement = el,
  ): void {
    Object.defineProperty(el, 'clientWidth', {
      configurable: true,
      get: () => (lockedBy.style.overflow === 'hidden' ? widths.locked : widths.scrolling),
    });
  }

  describe('no scrollbar is given back', () => {
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

    it('does not pad when the viewport keeps its width across the lock', () => {
      modelClientWidth(document.documentElement, { scrolling: 1009, locked: 1009 }, document.body);
      try {
        lock.lock();
        expect(document.body.style.paddingRight).toBe('');
      } finally {
        delete (document.documentElement as unknown as Record<string, unknown>)['clientWidth'];
      }
    });
  });

  describe('classic page scrollbar', () => {
    beforeEach(() => {
      modelClientWidth(document.documentElement, { scrolling: 1009, locked: 1024 }, document.body);
    });

    afterEach(() => {
      delete (document.documentElement as unknown as Record<string, unknown>)['clientWidth'];
    });

    it('pads the body by the scrollbar width measured before overflow is hidden', () => {
      lock.lock();
      expect(document.body.style.paddingRight).toBe('15px');
    });

    it('adds the compensation to the padding the body already has', () => {
      document.body.style.paddingRight = '24px';
      lock.lock();
      expect(document.body.style.paddingRight).toBe('39px');
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

    it('clears the compensation on the last unlock', () => {
      lock.lock();
      lock.lock();
      lock.unlock();
      expect(document.body.style.paddingRight).toBe('15px');
      lock.unlock();
      expect(document.body.style.paddingRight).toBe('');
    });
  });

  describe('scrollbar-gutter: stable', () => {
    beforeEach(() => {
      modelClientWidth(document.documentElement, { scrolling: 1009, locked: 1024 }, document.body);
    });

    afterEach(() => {
      delete (document.documentElement as unknown as Record<string, unknown>)['clientWidth'];
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

  describe('<html> declaring its own overflow', () => {
    afterEach(() => {
      document.documentElement.style.cssText = '';
    });

    it('locks <html> too when its overflow scrolls the viewport', () => {
      document.documentElement.style.overflowY = 'scroll';
      lock.lock();
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('clears the <html> overflow on the last unlock only', () => {
      document.documentElement.style.overflowY = 'auto';
      lock.lock();
      lock.lock();
      lock.unlock();
      expect(document.documentElement.style.overflow).toBe('hidden');
      lock.unlock();
      expect(document.documentElement.style.overflow).toBe('');
    });

    it('leaves <html> alone when its overflow cannot scroll the viewport', () => {
      document.documentElement.style.overflow = 'clip';
      lock.lock();
      lock.unlock();
      expect(document.documentElement.style.overflow).toBe('clip');
    });

    it('leaves <html> alone by default', () => {
      lock.lock();
      expect(document.documentElement.style.overflow).toBe('');
    });
  });

  describe('element-scoped lock', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.style.overflow = '';
      container.remove();
    });

    it('lock(container) sets overflow:hidden on the container, not body', () => {
      lock.lock(container);
      expect(container.style.overflow).toBe('hidden');
      expect(document.body.style.overflow).toBe('');
    });

    it('unlock(container) clears container overflow back to empty string', () => {
      lock.lock(container);
      lock.unlock(container);
      expect(container.style.overflow).toBe('');
    });

    it('refcounts per element: two locks then one unlock keeps it hidden', () => {
      lock.lock(container);
      lock.lock(container);
      lock.unlock(container);
      expect(container.style.overflow).toBe('hidden');
      lock.unlock(container);
      expect(container.style.overflow).toBe('');
    });

    it('pads the container by its scrollbar width, borders excluded', () => {
      Object.defineProperty(container, 'offsetWidth', { configurable: true, get: () => 402 });
      modelClientWidth(container, { scrolling: 383, locked: 400 });
      container.style.paddingRight = '8px';
      lock.lock(container);
      expect(container.style.paddingRight).toBe('25px');
      lock.unlock(container);
      expect(container.style.paddingRight).toBe('');
    });

    it('never locks <html> for a container', () => {
      document.documentElement.style.overflowY = 'scroll';
      try {
        lock.lock(container);
        expect(document.documentElement.style.overflow).toBe('');
      } finally {
        document.documentElement.style.cssText = '';
      }
    });

    it('body lock and container lock are independent', () => {
      lock.lock();
      lock.lock(container);
      expect(document.body.style.overflow).toBe('hidden');
      expect(container.style.overflow).toBe('hidden');

      lock.unlock();
      expect(document.body.style.overflow).toBe('');
      expect(container.style.overflow).toBe('hidden');

      lock.unlock(container);
      expect(container.style.overflow).toBe('');
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
