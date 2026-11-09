import { FLIP_ANIMATING_ATTR, flipDelta, playFlip } from './flip';

type FakeTransition = Partial<
  Pick<CSSStyleDeclaration, 'transitionProperty' | 'transitionDuration' | 'transitionDelay'>
>;

interface FakeWin {
  readonly win: Window;
  readonly timeouts: { fn: () => void; delay: number }[];
}

const TRANSFORM_300MS: FakeTransition = {
  transitionProperty: 'transform',
  transitionDuration: '300ms',
};

function fakeWin(transition: FakeTransition): FakeWin {
  const timeouts: { fn: () => void; delay: number }[] = [];
  const win = {
    getComputedStyle: () => transition as CSSStyleDeclaration,
    setTimeout: ((fn: () => void, delay: number): number => {
      timeouts.push({ fn, delay });
      return timeouts.length;
    }) as Window['setTimeout'],
  } as unknown as Window;
  return { win, timeouts };
}

function transitionEnd(target: Element, propertyName: string): void {
  const event = new Event('transitionend', { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  target.dispatchEvent(event);
}

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
    });

    function play(transition: FakeTransition): FakeWin {
      const fake = fakeWin(transition);
      playFlip({ first: new Map([[el, { left: 0, top: 80 }]]), win: fake.win });
      return fake;
    }

    it('inverts with a bare translate and transitions back to no transform', () => {
      const { timeouts } = play(TRANSFORM_300MS);

      expect(inverted).toMatch(/^translate\([^)]+\)$/);
      expect(el.style.transform).toBe('');
      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(true);

      timeouts[0]!.fn();

      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(false);
      expect(el.style.transform).toBe('');
    });

    it('keeps a positioning transform it already carries, before and after the transition', () => {
      el.style.transform = 'translateY(120px)';

      const { timeouts } = play(TRANSFORM_300MS);

      expect(inverted).toMatch(/^translate\([^)]+\) translateY\(120px\)$/);
      expect(el.style.transform).toBe('translateY(120px)');

      timeouts[0]!.fn();

      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(false);
      expect(el.style.transform).toBe('translateY(120px)');
    });

    it('times the fallback from the computed transform transition, not a fixed 500 ms', () => {
      const { timeouts } = play({ transitionProperty: 'transform', transitionDuration: '800ms' });

      expect(timeouts.map((t) => t.delay)).toEqual([800 + 50]);
      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(true);
    });

    it('clears data-drag-animating at once when no transition is configured', () => {
      const { timeouts } = play({ transitionDuration: '0s' });

      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(false);
      expect(el.style.transition).toBe('');
      expect(timeouts).toEqual([]);
    });

    it('clears on the transform transitionend that follows an opacity transitionend', () => {
      play({
        transitionProperty: 'opacity, transform',
        transitionDuration: '100ms, 300ms',
      });

      transitionEnd(el, 'opacity');
      expect(el.hasAttribute(FLIP_ANIMATING_ATTR), 'an opacity end must not clear').toBe(true);

      transitionEnd(el, 'transform');
      expect(
        el.hasAttribute(FLIP_ANIMATING_ATTR),
        'the transform end was not heard: the opacity end spent the listener',
      ).toBe(false);
    });

    it('ignores a transform transitionend bubbling up from a descendant', () => {
      const child = el.appendChild(document.createElement('span'));
      play(TRANSFORM_300MS);

      transitionEnd(child, 'transform');
      expect(
        el.hasAttribute(FLIP_ANIMATING_ATTR),
        'a descendant transform end cleared the hook before its own transition ended',
      ).toBe(true);

      transitionEnd(el, 'transform');
      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(false);
    });

    it('leaves a hook set after the transform end alone when the fallback fires later', () => {
      const { timeouts } = play(TRANSFORM_300MS);

      transitionEnd(el, 'transform');
      el.setAttribute(FLIP_ANIMATING_ATTR, '');
      timeouts[0]!.fn();

      expect(el.hasAttribute(FLIP_ANIMATING_ATTR)).toBe(true);
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
