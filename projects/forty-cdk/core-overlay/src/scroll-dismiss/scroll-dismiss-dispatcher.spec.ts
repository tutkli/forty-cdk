import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS } from './scroll-dismiss';
import { ScrollDismissDispatcher } from './scroll-dismiss-dispatcher';

function scrollListenerCount(calls: readonly (readonly unknown[])[]): number {
  return calls.filter((call) => call[0] === 'scroll').length;
}

describe('ScrollDismissDispatcher', () => {
  describe('browser', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    });

    it('installs a single shared scroll listener for multiple subscribers', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);

      let a = 0;
      let b = 0;
      const offA = dispatcher.register(() => (a += 1));
      const offB = dispatcher.register(() => (b += 1));
      try {
        expect(scrollListenerCount(addSpy.mock.calls)).toBe(1);

        document.dispatchEvent(new Event('scroll'));
        expect(a).toBe(1);
        expect(b).toBe(1);
      } finally {
        offA();
        offB();
      }
    });

    it('tears the listener down only with the last unregister (refcounted)', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);

      const offA = dispatcher.register(() => undefined);
      const offB = dispatcher.register(() => undefined);
      expect(scrollListenerCount(addSpy.mock.calls)).toBe(1);

      offA();
      dispatcher.register(() => undefined)();
      expect(scrollListenerCount(addSpy.mock.calls)).toBe(1);

      offB();
      const offAfterTeardown = dispatcher.register(() => undefined);
      try {
        expect(scrollListenerCount(addSpy.mock.calls)).toBe(2);
      } finally {
        offAfterTeardown();
      }
    });

    it('re-installs the listener after a full teardown when a new subscriber registers', () => {
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);

      let hits = 0;
      const off1 = dispatcher.register(() => (hits += 1));
      off1();

      document.dispatchEvent(new Event('scroll'));
      expect(hits).toBe(0);

      const off2 = dispatcher.register(() => (hits += 1));
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(1);
      } finally {
        off2();
      }
    });

    it('stops dismissing a subscriber after it unregisters', () => {
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);

      let a = 0;
      let b = 0;
      const offA = dispatcher.register(() => (a += 1));
      const offB = dispatcher.register(() => (b += 1));

      offA();
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(a).toBe(0);
        expect(b).toBe(1);
      } finally {
        offB();
      }
    });

    it('tracks duplicate callbacks independently', () => {
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);

      let hits = 0;
      const fn = () => (hits += 1);
      const offA = dispatcher.register(fn);
      const offB = dispatcher.register(fn);
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(2);

        offA();
        hits = 0;
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(1);
      } finally {
        offB();
      }
    });

    it('does not tear down the shared listener while a duplicate registration survives', () => {
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);

      let hits = 0;
      const fn = (): number => (hits += 1);
      const offA = dispatcher.register(fn);
      const offB = dispatcher.register(fn);

      offA();
      document.dispatchEvent(new Event('scroll'));
      expect(hits).toBe(1);

      offB();
      hits = 0;
      document.dispatchEvent(new Event('scroll'));
      expect(hits).toBe(0);
    });

    it('teardown is idempotent and does not affect a sibling registration', () => {
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);

      let a = 0;
      let b = 0;
      const offA = dispatcher.register(() => (a += 1));
      const offB = dispatcher.register(() => (b += 1));

      offA();
      offA();
      document.dispatchEvent(new Event('scroll'));
      expect(a).toBe(0);
      expect(b).toBe(1);

      offB();
      document.dispatchEvent(new Event('scroll'));
      expect(b).toBe(1);
    });
  });

  describe('shared suppression window', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens on scroll and closes after the default window elapses', () => {
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);
      const off = dispatcher.register(() => undefined);
      try {
        expect(dispatcher.isSuppressed()).toBe(false);

        document.dispatchEvent(new Event('scroll'));
        expect(dispatcher.isSuppressed()).toBe(true);

        vi.advanceTimersByTime(DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS - 1);
        expect(dispatcher.isSuppressed()).toBe(true);

        vi.advanceTimersByTime(1);
        expect(dispatcher.isSuppressed()).toBe(false);
      } finally {
        off();
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
        const dispatcher = TestBed.inject(ScrollDismissDispatcher);
        const hits = { count: 0 };
        const off = dispatcher.register(() => (hits.count += 1), {
          anchor,
          surface: () => surface,
        });
        return { dispatcher, hits, off };
      }

      it('dismisses on a document scroll and on a scroll of a container holding the anchor', () => {
        const { hits, off } = registerScoped();
        try {
          document.dispatchEvent(new Event('scroll'));
          container.dispatchEvent(new Event('scroll'));
          expect(hits.count).toBe(2);
        } finally {
          off();
        }
      });

      it('skips a scroll inside the surface, yet still opens the suppression window', () => {
        const { dispatcher, hits, off } = registerScoped();
        const region = document.createElement('div');
        surface.appendChild(region);
        try {
          region.dispatchEvent(new Event('scroll'));
          expect(hits.count).toBe(0);
          expect(dispatcher.isSuppressed()).toBe(true);
        } finally {
          off();
        }
      });

      it('skips a scroll of a container that does not hold the anchor', () => {
        const { hits, off } = registerScoped();
        try {
          unrelated.dispatchEvent(new Event('scroll'));
          expect(hits.count).toBe(0);
        } finally {
          off();
        }
      });

      it('dismisses on any scroll while the anchor is unset or detached', () => {
        let anchorEl: Element | null = null;
        const { hits, off } = registerScoped(() => anchorEl);
        try {
          unrelated.dispatchEvent(new Event('scroll'));
          anchorEl = document.createElement('button');
          unrelated.dispatchEvent(new Event('scroll'));
          expect(hits.count).toBe(2);
        } finally {
          off();
        }
      });

      it('scopes each registration on its own', () => {
        const dispatcher = TestBed.inject(ScrollDismissDispatcher);
        let unscoped = 0;
        const offUnscoped = dispatcher.register(() => (unscoped += 1));
        const { hits, off } = registerScoped();
        try {
          unrelated.dispatchEvent(new Event('scroll'));
          expect(unscoped).toBe(1);
          expect(hits.count).toBe(0);
        } finally {
          off();
          offUnscoped();
        }
      });
    });

    it('reports not suppressed while no subscriber is registered', () => {
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);
      expect(dispatcher.isSuppressed()).toBe(false);
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
      const dispatcher = TestBed.inject(ScrollDismissDispatcher);

      let hits = 0;
      const off = dispatcher.register(() => (hits += 1));
      try {
        document.dispatchEvent(new Event('scroll'));
        expect(hits).toBe(0);
        expect(scrollListenerCount(addSpy.mock.calls)).toBe(0);
        expect(dispatcher.isSuppressed()).toBe(false);
      } finally {
        off();
      }
    });
  });
});
