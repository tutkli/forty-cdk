import { FLIP_ANIMATING_ATTR, flipDelta, playFlip } from './flip';

describe('flipDelta', () => {
  it('returns negative dy when element moved down (Last below First)', () => {
    expect(flipDelta({ left: 0, top: 0 }, { left: 0, top: 40 })).toEqual({ dx: 0, dy: -40 });
  });

  it('returns positive dy when element moved up (Last above First)', () => {
    expect(flipDelta({ left: 0, top: 40 }, { left: 0, top: 0 })).toEqual({ dx: 0, dy: 40 });
  });

  it('returns correct dx for a horizontal move', () => {
    expect(flipDelta({ left: 100, top: 0 }, { left: 60, top: 0 })).toEqual({ dx: 40, dy: 0 });
  });

  it('returns (0, 0) when element did not move', () => {
    expect(flipDelta({ left: 10, top: 20 }, { left: 10, top: 20 })).toEqual({ dx: 0, dy: 0 });
  });
});

describe('playFlip', () => {
  afterEach(() => {
    document
      .querySelectorAll('[data-drag-animating]')
      .forEach((n) => n.removeAttribute(FLIP_ANIMATING_ATTR));
  });

  it('is a no-op when win is null — no data-drag-animating and no inline transform', () => {
    const el = document.createElement('div');
    const first = new Map([[el, { left: 0, top: 0 }]]);
    playFlip({ first, win: null });
    expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(false);
    expect(el.style.transform).toBe('');
  });

  it('skips an element that is not connected — no data-drag-animating', () => {
    const el = document.createElement('div');
    const first = new Map([[el, { left: 0, top: 100 }]]);
    playFlip({ first, win: window });
    expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(false);
  });

  describe('a moved element', () => {
    let el: HTMLElement;
    let inverted: string | null;

    beforeEach(() => {
      vi.useFakeTimers();
      el = document.createElement('div');
      document.body.appendChild(el);
      inverted = null;
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 120 } as DOMRect);
      Object.defineProperty(el, 'offsetWidth', {
        configurable: true,
        get: () => {
          inverted = el.style.transform;
          return 100;
        },
      });
    });

    afterEach(() => {
      el.remove();
      vi.useRealTimers();
    });

    it('inverts with a bare translate and transitions back to no transform', () => {
      playFlip({ first: new Map([[el, { left: 0, top: 80 }]]), win: window });

      expect(inverted).toMatch(/^translate\([^)]+\)$/);
      expect(el.style.transform).toBe('');
      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(true);

      vi.advanceTimersByTime(500);

      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(false);
      expect(el.style.transform).toBe('');
    });

    it('keeps a positioning transform it already carries, before and after the transition', () => {
      el.style.transform = 'translateY(120px)';

      playFlip({ first: new Map([[el, { left: 0, top: 80 }]]), win: window });

      expect(inverted).toMatch(/^translate\([^)]+\) translateY\(120px\)$/);
      expect(el.style.transform).toBe('translateY(120px)');

      vi.advanceTimersByTime(500);

      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(false);
      expect(el.style.transform).toBe('translateY(120px)');
    });
  });

  it('skips the exclude element — no data-drag-animating', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    try {
      const first = new Map([[el, { left: 0, top: 100 }]]);
      playFlip({ first, win: window, exclude: el });
      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(false);
    } finally {
      el.remove();
    }
  });
});
