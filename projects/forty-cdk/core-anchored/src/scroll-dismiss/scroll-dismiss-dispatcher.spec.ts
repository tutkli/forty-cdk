import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS,
  ScrollDismissDispatcher,
  type ScrollDismissOptions,
  type ScrollDismissRegistration,
} from './scroll-dismiss-dispatcher';

function scrollListenerCount(calls: readonly (readonly unknown[])[]): number {
  return calls.filter((call) => call[0] === 'scroll').length;
}

function register(options: ScrollDismissOptions): ScrollDismissRegistration {
  return TestBed.inject(ScrollDismissDispatcher).register(options);
}

describe('ScrollDismissDispatcher', () => {
  describe('browser', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    });

    it('installs a single shared scroll listener for multiple subscribers', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      let a = 0;
      let b = 0;
      const regA = register({ dismiss: () => (a += 1) });
      const regB = register({ dismiss: () => (b += 1) });
      try {
        expect(scrollListenerCount(addSpy.mock.calls)).toBe(1);

        document.dispatchEvent(new Event('scroll'));
        expect(a).toBe(1);
        expect(b).toBe(1);
      } finally {
        regA.unregister();
        regB.unregister();
      }
    });

    it('tears the listener down only with the last unregister (refcounted)', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      const regA = register({ dismiss: () => undefined });
      const regB = register({ dismiss: () => undefined });
      expect(scrollListenerCount(addSpy.mock.calls)).toBe(1);

      regA.unregister();
      register({ dismiss: () => undefined }).unregister();
      expect(scrollListenerCount(addSpy.mock.calls)).toBe(1);

      regB.unregister();
      const afterTeardown = register({ dismiss: () => undefined });
      try {
        expect(scrollListenerCount(addSpy.mock.calls)).toBe(2);
      } finally {
        afterTeardown.unregister();
      }
    });

    it('re-installs the listener after a full teardown when a new subscriber registers', () => {
      let hits = 0;
      register({ dismiss: () => (hits += 1) }).unregister();

      document.dispatchEvent(new Event('scroll'));
      expect(hits).toBe(0);

      const reg = register({ dismiss: () => (hits += 1) });
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(1);
      } finally {
        reg.unregister();
      }
    });

    it('stops dismissing a subscriber after it unregisters', () => {
      let a = 0;
      let b = 0;
      const regA = register({ dismiss: () => (a += 1) });
      const regB = register({ dismiss: () => (b += 1) });

      regA.unregister();
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(a).toBe(0);
        expect(b).toBe(1);
      } finally {
        regB.unregister();
      }
    });

    it('tracks duplicate callbacks independently', () => {
      let hits = 0;
      const dismiss = (): number => (hits += 1);
      const regA = register({ dismiss });
      const regB = register({ dismiss });
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(2);

        regA.unregister();
        hits = 0;
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(1);
      } finally {
        regB.unregister();
      }
    });

    it('unregister is idempotent and does not affect a sibling registration', () => {
      let a = 0;
      let b = 0;
      const regA = register({ dismiss: () => (a += 1) });
      const regB = register({ dismiss: () => (b += 1) });

      regA.unregister();
      regA.unregister();
      document.dispatchEvent(new Event('scroll'));
      expect(a).toBe(0);
      expect(b).toBe(1);

      regB.unregister();
      document.dispatchEvent(new Event('scroll'));
      expect(b).toBe(1);
    });

    it('catches a scroll on a descendant element through the capture phase', () => {
      const inner = document.createElement('div');
      document.body.appendChild(inner);
      let hits = 0;
      const reg = register({ dismiss: () => (hits += 1) });
      try {
        inner.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(1);
      } finally {
        reg.unregister();
        inner.remove();
      }
    });

    it('skips an inactive registration without reading its scope', () => {
      let active = false;
      let hits = 0;
      const anchor = vi.fn(() => null);
      const surface = vi.fn(() => null);
      const reg = register({
        dismiss: () => (hits += 1),
        scope: { anchor, surface },
        active: () => active,
      });
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(0);
        expect(anchor).not.toHaveBeenCalled();
        expect(surface).not.toHaveBeenCalled();

        active = true;
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(1);
      } finally {
        reg.unregister();
      }
    });
  });

  describe('suppression window', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens on scroll and closes after the default window elapses', () => {
      const reg = register({ dismiss: () => undefined });
      try {
        expect(reg.isSuppressed()).toBe(false);

        document.dispatchEvent(new Event('scroll'));
        expect(reg.isSuppressed()).toBe(true);

        vi.advanceTimersByTime(DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS - 1);
        expect(reg.isSuppressed()).toBe(true);

        vi.advanceTimersByTime(1);
        expect(reg.isSuppressed()).toBe(false);
      } finally {
        reg.unregister();
      }
    });

    it('re-arms on each scroll so a continuous gesture stays suppressed', () => {
      const reg = register({ dismiss: () => undefined });
      try {
        document.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS - 50);
        document.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS - 50);
        expect(reg.isSuppressed()).toBe(true);

        vi.advanceTimersByTime(50);
        expect(reg.isSuppressed()).toBe(false);
      } finally {
        reg.unregister();
      }
    });

    it('suppresses an inactive registration whose scope the scroll concerns', () => {
      const reg = register({ dismiss: () => undefined, active: () => false });
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(reg.isSuppressed()).toBe(true);
      } finally {
        reg.unregister();
      }
    });

    it('reports not suppressed after unregister', () => {
      const keep = register({ dismiss: () => undefined });
      const reg = register({ dismiss: () => undefined });
      try {
        document.dispatchEvent(new Event('scroll'));
        reg.unregister();
        expect(reg.isSuppressed()).toBe(false);
        expect(keep.isSuppressed()).toBe(true);
      } finally {
        keep.unregister();
      }
    });

    describe('scope', () => {
      let container: HTMLElement;
      let trigger: HTMLElement;
      let surface: HTMLElement;
      let unrelated: HTMLElement;

      beforeEach(() => {
        container = document.createElement('div');
        trigger = document.createElement('button');
        container.appendChild(trigger);
        surface = document.createElement('div');
        unrelated = document.createElement('div');
        document.body.append(container, surface, unrelated);
      });

      afterEach(() => {
        container.remove();
        surface.remove();
        unrelated.remove();
      });

      function registerScoped(anchor: () => Element | null = () => trigger) {
        const hits = { count: 0 };
        const reg = register({
          dismiss: () => (hits.count += 1),
          scope: { anchor, surface: () => surface },
        });
        return { hits, reg };
      }

      it('dismisses and suppresses on a document scroll and on a container holding the anchor', () => {
        const { hits, reg } = registerScoped();
        try {
          document.dispatchEvent(new Event('scroll'));
          expect(reg.isSuppressed()).toBe(true);
          vi.advanceTimersByTime(DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS);

          container.dispatchEvent(new Event('scroll'));
          expect(reg.isSuppressed()).toBe(true);
          expect(hits.count).toBe(2);
        } finally {
          reg.unregister();
        }
      });

      it('neither dismisses nor suppresses on a scroll inside the surface', () => {
        const { hits, reg } = registerScoped();
        const region = document.createElement('div');
        surface.appendChild(region);
        try {
          region.dispatchEvent(new Event('scroll'));
          expect(hits.count).toBe(0);
          expect(reg.isSuppressed()).toBe(false);
        } finally {
          reg.unregister();
        }
      });

      it('neither dismisses nor suppresses on a container that does not hold the anchor', () => {
        const { hits, reg } = registerScoped();
        try {
          unrelated.dispatchEvent(new Event('scroll'));
          expect(hits.count).toBe(0);
          expect(reg.isSuppressed()).toBe(false);
        } finally {
          reg.unregister();
        }
      });

      it('keeps a concerning scroll suppressing while an unrelated container scrolls after it', () => {
        const { reg } = registerScoped();
        try {
          container.dispatchEvent(new Event('scroll'));
          vi.advanceTimersByTime(50);
          unrelated.dispatchEvent(new Event('scroll'));
          expect(reg.isSuppressed()).toBe(true);

          vi.advanceTimersByTime(DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS - 50);
          unrelated.dispatchEvent(new Event('scroll'));
          expect(reg.isSuppressed()).toBe(false);
        } finally {
          reg.unregister();
        }
      });

      it('treats every scroll as in scope while the anchor is unset or detached', () => {
        let anchorEl: Element | null = null;
        const { hits, reg } = registerScoped(() => anchorEl);
        try {
          unrelated.dispatchEvent(new Event('scroll'));
          expect(reg.isSuppressed()).toBe(true);
          anchorEl = document.createElement('button');
          unrelated.dispatchEvent(new Event('scroll'));
          expect(hits.count).toBe(2);
        } finally {
          reg.unregister();
        }
      });

      it('scopes each registration on its own', () => {
        let unscopedHits = 0;
        const unscoped = register({ dismiss: () => (unscopedHits += 1) });
        const { hits, reg } = registerScoped();
        try {
          unrelated.dispatchEvent(new Event('scroll'));
          expect(unscopedHits).toBe(1);
          expect(unscoped.isSuppressed()).toBe(true);
          expect(hits.count).toBe(0);
          expect(reg.isSuppressed()).toBe(false);
        } finally {
          reg.unregister();
          unscoped.unregister();
        }
      });
    });
  });

  describe('server', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
      });
    });

    it('registers no listener and stays a no-op', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      let hits = 0;
      const reg = register({ dismiss: () => (hits += 1) });
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(0);
        expect(scrollListenerCount(addSpy.mock.calls)).toBe(0);
        expect(reg.isSuppressed()).toBe(false);
      } finally {
        reg.unregister();
      }
    });
  });
});
