import { isScrollableAtEdge } from './scroll-boundary';

interface ScrollMetrics {
  readonly scrollTop?: number;
  readonly scrollLeft?: number;
  readonly scrollHeight?: number;
  readonly clientHeight?: number;
  readonly scrollWidth?: number;
  readonly clientWidth?: number;
}

function scroller(
  axis: 'x' | 'y',
  metrics: ScrollMetrics,
  dir: 'ltr' | 'rtl' = 'ltr',
): HTMLElement {
  const el = document.createElement('div');
  el.style.setProperty(axis === 'x' ? 'overflow-x' : 'overflow-y', 'auto');
  el.style.direction = dir;
  el.dir = dir;
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(el, key, { configurable: true, value });
  }
  el.appendChild(document.createElement('span'));
  return el;
}

describe('isScrollableAtEdge', () => {
  const mounted: HTMLElement[] = [];

  function mount(el: HTMLElement): HTMLElement {
    document.body.appendChild(el);
    mounted.push(el);
    return el;
  }

  afterEach(() => {
    for (const el of mounted.splice(0)) {
      el.remove();
    }
  });

  describe('vertical', () => {
    it('defers a downward swipe while the scroller can still scroll up', () => {
      const el = mount(scroller('y', { scrollTop: 40, scrollHeight: 500, clientHeight: 200 }));
      expect(isScrollableAtEdge(el.firstElementChild, 'down', null)).toBe(true);
    });

    it('lets a downward swipe through at the top edge', () => {
      const el = mount(scroller('y', { scrollTop: 0, scrollHeight: 500, clientHeight: 200 }));
      expect(isScrollableAtEdge(el.firstElementChild, 'down', null)).toBe(false);
    });

    it('treats a fractional scrollTop at the far edge as the edge', () => {
      const el = mount(scroller('y', { scrollTop: 433.6, scrollHeight: 734, clientHeight: 300 }));
      expect(isScrollableAtEdge(el.firstElementChild, 'up', null)).toBe(false);
    });

    it('treats a sub-pixel scrollTop at the start as the edge', () => {
      const el = mount(scroller('y', { scrollTop: 0.4, scrollHeight: 734, clientHeight: 300 }));
      expect(isScrollableAtEdge(el.firstElementChild, 'down', null)).toBe(false);
    });

    it('defers an upward swipe while the scroller has room below', () => {
      const el = mount(scroller('y', { scrollTop: 100, scrollHeight: 734, clientHeight: 300 }));
      expect(isScrollableAtEdge(el.firstElementChild, 'up', null)).toBe(true);
    });
  });

  describe('horizontal, left to right', () => {
    it('defers a rightward swipe while there is content to the left', () => {
      const el = mount(scroller('x', { scrollLeft: 50, scrollWidth: 300, clientWidth: 100 }));
      expect(isScrollableAtEdge(el.firstElementChild, 'right', null)).toBe(true);
    });

    it('lets a rightward swipe through at the start edge', () => {
      const el = mount(scroller('x', { scrollLeft: 0, scrollWidth: 300, clientWidth: 100 }));
      expect(isScrollableAtEdge(el.firstElementChild, 'right', null)).toBe(false);
    });

    it('lets a leftward swipe through at the far edge, fractional or not', () => {
      const el = mount(scroller('x', { scrollLeft: 199.5, scrollWidth: 300, clientWidth: 100 }));
      expect(isScrollableAtEdge(el.firstElementChild, 'left', null)).toBe(false);
    });
  });

  describe('horizontal, right to left', () => {
    it('defers a rightward swipe at the initial position, where the overflow is to the left', () => {
      const el = mount(scroller('x', { scrollLeft: 0, scrollWidth: 300, clientWidth: 100 }, 'rtl'));
      expect(isScrollableAtEdge(el.firstElementChild, 'right', null)).toBe(true);
    });

    it('lets a leftward swipe through at the initial position', () => {
      const el = mount(scroller('x', { scrollLeft: 0, scrollWidth: 300, clientWidth: 100 }, 'rtl'));
      expect(isScrollableAtEdge(el.firstElementChild, 'left', null)).toBe(false);
    });

    it('defers a leftward swipe once the scroller has moved off its initial position', () => {
      const el = mount(
        scroller('x', { scrollLeft: -50, scrollWidth: 300, clientWidth: 100 }, 'rtl'),
      );
      expect(isScrollableAtEdge(el.firstElementChild, 'left', null)).toBe(true);
    });

    it('lets a rightward swipe through at the far edge', () => {
      const el = mount(
        scroller('x', { scrollLeft: -200, scrollWidth: 300, clientWidth: 100 }, 'rtl'),
      );
      expect(isScrollableAtEdge(el.firstElementChild, 'right', null)).toBe(false);
    });
  });

  describe('the walk', () => {
    it('stops at the boundary', () => {
      const outer = mount(scroller('y', { scrollTop: 40, scrollHeight: 500, clientHeight: 200 }));
      const boundary = document.createElement('div');
      const target = document.createElement('span');
      boundary.appendChild(target);
      outer.replaceChildren(boundary);

      expect(isScrollableAtEdge(target, 'down', boundary)).toBe(false);
      expect(isScrollableAtEdge(target, 'down', null)).toBe(true);
    });

    it('climbs out of a shadow root to a scroller above its host', () => {
      const outer = mount(scroller('y', { scrollTop: 40, scrollHeight: 500, clientHeight: 200 }));
      const host = document.createElement('div');
      outer.replaceChildren(host);
      const target = document.createElement('span');
      host.attachShadow({ mode: 'open' }).appendChild(target);

      expect(isScrollableAtEdge(target, 'down', null)).toBe(true);
    });

    it('stops at a boundary that hosts the shadow root the target lives in', () => {
      const outer = mount(scroller('y', { scrollTop: 40, scrollHeight: 500, clientHeight: 200 }));
      const boundary = document.createElement('div');
      outer.replaceChildren(boundary);
      const target = document.createElement('span');
      boundary.attachShadow({ mode: 'open' }).appendChild(target);

      expect(isScrollableAtEdge(target, 'down', boundary)).toBe(false);
    });
  });
});
