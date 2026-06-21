import {
  moveGridIndex,
  moveIndex,
  resolveGridNavigation,
  resolveListNavigation,
  resolveTreeExpandCollapse,
  resolveTreegridExpandCollapse,
} from './keyboard-navigation';

const key = (k: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key: k, ...init });

describe('resolveListNavigation', () => {
  describe('vertical orientation', () => {
    const opts = { orientation: 'vertical' as const };

    it.each([
      ['ArrowUp', 'prev'],
      ['ArrowDown', 'next'],
      ['Home', 'first'],
      ['End', 'last'],
    ])('%s → %s', (k, expected) => {
      expect(resolveListNavigation(key(k), opts)).toBe(expected);
    });

    it('ignores ArrowLeft / ArrowRight', () => {
      expect(resolveListNavigation(key('ArrowLeft'), opts)).toBe(null);
      expect(resolveListNavigation(key('ArrowRight'), opts)).toBe(null);
    });
  });

  describe('horizontal orientation', () => {
    const opts = { orientation: 'horizontal' as const };

    it.each([
      ['ArrowLeft', 'prev'],
      ['ArrowRight', 'next'],
      ['Home', 'first'],
      ['End', 'last'],
    ])('%s → %s', (k, expected) => {
      expect(resolveListNavigation(key(k), opts)).toBe(expected);
    });

    it('ignores ArrowUp / ArrowDown', () => {
      expect(resolveListNavigation(key('ArrowUp'), opts)).toBe(null);
      expect(resolveListNavigation(key('ArrowDown'), opts)).toBe(null);
    });
  });

  describe('horizontal RTL', () => {
    const opts = { orientation: 'horizontal' as const, dir: 'rtl' as const };

    it('swaps ArrowLeft → next, ArrowRight → prev', () => {
      expect(resolveListNavigation(key('ArrowLeft'), opts)).toBe('next');
      expect(resolveListNavigation(key('ArrowRight'), opts)).toBe('prev');
    });
  });

  describe('both orientation', () => {
    const opts = { orientation: 'both' as const };

    it('accepts every arrow direction', () => {
      expect(resolveListNavigation(key('ArrowUp'), opts)).toBe('prev');
      expect(resolveListNavigation(key('ArrowDown'), opts)).toBe('next');
      expect(resolveListNavigation(key('ArrowLeft'), opts)).toBe('prev');
      expect(resolveListNavigation(key('ArrowRight'), opts)).toBe('next');
    });
  });

  describe('pageKeys', () => {
    it('maps PageUp / PageDown when enabled', () => {
      const opts = { orientation: 'vertical' as const, pageKeys: true };
      expect(resolveListNavigation(key('PageUp'), opts)).toBe('first');
      expect(resolveListNavigation(key('PageDown'), opts)).toBe('last');
    });

    it('ignores them otherwise', () => {
      const opts = { orientation: 'vertical' as const };
      expect(resolveListNavigation(key('PageUp'), opts)).toBe(null);
      expect(resolveListNavigation(key('PageDown'), opts)).toBe(null);
    });
  });

  it('returns null for unrelated keys', () => {
    expect(resolveListNavigation(key('Tab'), { orientation: 'both' })).toBe(null);
    expect(resolveListNavigation(key('a'), { orientation: 'both' })).toBe(null);
  });
});

describe('resolveGridNavigation', () => {
  const opts = { cols: 7 };

  it('maps arrows to row / column actions', () => {
    expect(resolveGridNavigation(key('ArrowUp'), opts)).toBe('prev-row');
    expect(resolveGridNavigation(key('ArrowDown'), opts)).toBe('next-row');
    expect(resolveGridNavigation(key('ArrowLeft'), opts)).toBe('prev');
    expect(resolveGridNavigation(key('ArrowRight'), opts)).toBe('next');
  });

  it('Home / End = row extremes; Ctrl+Home / Ctrl+End = grid extremes', () => {
    expect(resolveGridNavigation(key('Home'), opts)).toBe('first-in-row');
    expect(resolveGridNavigation(key('End'), opts)).toBe('last-in-row');
    expect(resolveGridNavigation(key('Home', { ctrlKey: true }), opts)).toBe('first');
    expect(resolveGridNavigation(key('End', { ctrlKey: true }), opts)).toBe('last');
  });

  it('RTL swaps left/right', () => {
    const rtl = { cols: 7, dir: 'rtl' as const };
    expect(resolveGridNavigation(key('ArrowLeft'), rtl)).toBe('next');
    expect(resolveGridNavigation(key('ArrowRight'), rtl)).toBe('prev');
  });
});

describe('moveIndex', () => {
  it('moves next / prev with no loop', () => {
    expect(moveIndex(0, 5, 'next')).toBe(1);
    expect(moveIndex(4, 5, 'next')).toBe(null);
    expect(moveIndex(0, 5, 'prev')).toBe(null);
    expect(moveIndex(4, 5, 'prev')).toBe(3);
  });

  it('wraps when loop is true', () => {
    expect(moveIndex(4, 5, 'next', { loop: true })).toBe(0);
    expect(moveIndex(0, 5, 'prev', { loop: true })).toBe(4);
  });

  it('first / last respect disabled', () => {
    const isDisabled = (i: number) => i === 0 || i === 4;
    expect(moveIndex(2, 5, 'first', { isDisabled })).toBe(1);
    expect(moveIndex(2, 5, 'last', { isDisabled })).toBe(3);
  });

  it('skips disabled items in next / prev', () => {
    const isDisabled = (i: number) => i === 1 || i === 2;
    expect(moveIndex(0, 5, 'next', { isDisabled })).toBe(3);
    expect(moveIndex(3, 5, 'prev', { isDisabled })).toBe(0);
  });

  it('returns null when all items are disabled', () => {
    expect(moveIndex(0, 5, 'next', { loop: true, isDisabled: () => true })).toBe(null);
  });

  it('returns null on empty list', () => {
    expect(moveIndex(0, 0, 'next')).toBe(null);
    expect(moveIndex(0, 0, 'first')).toBe(null);
  });
});

describe('resolveTreegridExpandCollapse', () => {
  it('ArrowRight → expand in ltr (default)', () => {
    expect(resolveTreegridExpandCollapse(key('ArrowRight'))).toBe('expand');
  });

  it('ArrowLeft → collapse in ltr (default)', () => {
    expect(resolveTreegridExpandCollapse(key('ArrowLeft'))).toBe('collapse');
  });

  it('ArrowRight → collapse in rtl', () => {
    expect(resolveTreegridExpandCollapse(key('ArrowRight'), 'rtl')).toBe('collapse');
  });

  it('ArrowLeft → expand in rtl', () => {
    expect(resolveTreegridExpandCollapse(key('ArrowLeft'), 'rtl')).toBe('expand');
  });

  it('ArrowDown → null', () => {
    expect(resolveTreegridExpandCollapse(key('ArrowDown'))).toBe(null);
  });

  it('ArrowUp → null', () => {
    expect(resolveTreegridExpandCollapse(key('ArrowUp'))).toBe(null);
  });

  it('unrelated keys → null', () => {
    expect(resolveTreegridExpandCollapse(key('Enter'))).toBe(null);
    expect(resolveTreegridExpandCollapse(key(' '))).toBe(null);
    expect(resolveTreegridExpandCollapse(key('Tab'))).toBe(null);
  });
});

describe('resolveTreeExpandCollapse', () => {
  describe('vertical orientation (horizontal arrows, RTL-mirrored)', () => {
    const opts = { orientation: 'vertical' as const };

    it('ArrowRight → expand in ltr (default)', () => {
      expect(resolveTreeExpandCollapse(key('ArrowRight'), opts)).toBe('expand');
    });

    it('ArrowLeft → collapse in ltr (default)', () => {
      expect(resolveTreeExpandCollapse(key('ArrowLeft'), opts)).toBe('collapse');
    });

    it('ArrowRight → collapse in rtl', () => {
      expect(resolveTreeExpandCollapse(key('ArrowRight'), { ...opts, dir: 'rtl' })).toBe(
        'collapse',
      );
    });

    it('ArrowLeft → expand in rtl', () => {
      expect(resolveTreeExpandCollapse(key('ArrowLeft'), { ...opts, dir: 'rtl' })).toBe('expand');
    });

    it('ArrowDown / ArrowUp → null', () => {
      expect(resolveTreeExpandCollapse(key('ArrowDown'), opts)).toBe(null);
      expect(resolveTreeExpandCollapse(key('ArrowUp'), opts)).toBe(null);
    });
  });

  describe('horizontal orientation (vertical arrows)', () => {
    const opts = { orientation: 'horizontal' as const };

    it('ArrowDown → expand', () => {
      expect(resolveTreeExpandCollapse(key('ArrowDown'), opts)).toBe('expand');
    });

    it('ArrowUp → collapse', () => {
      expect(resolveTreeExpandCollapse(key('ArrowUp'), opts)).toBe('collapse');
    });

    it('horizontal arrows are unaffected by dir', () => {
      expect(resolveTreeExpandCollapse(key('ArrowDown'), { ...opts, dir: 'rtl' })).toBe('expand');
      expect(resolveTreeExpandCollapse(key('ArrowUp'), { ...opts, dir: 'rtl' })).toBe('collapse');
    });

    it('ArrowLeft / ArrowRight → null', () => {
      expect(resolveTreeExpandCollapse(key('ArrowLeft'), opts)).toBe(null);
      expect(resolveTreeExpandCollapse(key('ArrowRight'), opts)).toBe(null);
    });
  });

  it('unrelated keys → null in either orientation', () => {
    expect(resolveTreeExpandCollapse(key('Enter'), { orientation: 'vertical' })).toBe(null);
    expect(resolveTreeExpandCollapse(key(' '), { orientation: 'horizontal' })).toBe(null);
    expect(resolveTreeExpandCollapse(key('Tab'), { orientation: 'vertical' })).toBe(null);
  });
});

describe('moveGridIndex', () => {
  const cols = 3; // 3x3 grid (indices 0..8)

  it('next / prev step linearly without loop', () => {
    expect(moveGridIndex(0, 9, 'next', { cols })).toBe(1);
    expect(moveGridIndex(8, 9, 'next', { cols })).toBe(null);
    expect(moveGridIndex(8, 9, 'prev', { cols })).toBe(7);
  });

  it('next / prev wrap with loop', () => {
    expect(moveGridIndex(8, 9, 'next', { cols, loop: true })).toBe(0);
  });

  it('next-row / prev-row jump by cols', () => {
    expect(moveGridIndex(0, 9, 'next-row', { cols })).toBe(3);
    expect(moveGridIndex(3, 9, 'prev-row', { cols })).toBe(0);
    expect(moveGridIndex(0, 9, 'prev-row', { cols })).toBe(null);
    expect(moveGridIndex(8, 9, 'next-row', { cols })).toBe(null);
  });

  it('next-row falls back to last cell of partial last row', () => {
    // 7 items in a 3-col grid → rows: [0,1,2] [3,4,5] [6]
    // From index 1 (col 1, row 0) → next-row would be col 1, row 1 = 4, fine.
    // From index 4 (col 1, row 1) → next-row should land on 6 (last filled in row 2).
    expect(moveGridIndex(4, 7, 'next-row', { cols })).toBe(6);
  });

  it('first-in-row / last-in-row clamp to row bounds', () => {
    expect(moveGridIndex(4, 9, 'first-in-row', { cols })).toBe(3);
    expect(moveGridIndex(4, 9, 'last-in-row', { cols })).toBe(5);
  });

  it('first / last respect disabled', () => {
    const isDisabled = (i: number) => i === 0 || i === 8;
    expect(moveGridIndex(4, 9, 'first', { cols, isDisabled })).toBe(1);
    expect(moveGridIndex(4, 9, 'last', { cols, isDisabled })).toBe(7);
  });

  it('skips disabled in next', () => {
    const isDisabled = (i: number) => i === 1 || i === 2;
    expect(moveGridIndex(0, 9, 'next', { cols, isDisabled })).toBe(3);
  });

  it('next-row skips a disabled cell to the next enabled cell in the column', () => {
    const isDisabled = (i: number) => i === 3;
    expect(moveGridIndex(0, 9, 'next-row', { cols, isDisabled })).toBe(6);
  });

  it('next-row returns null when every cell below in the column is disabled', () => {
    const isDisabled = (i: number) => i === 3 || i === 6;
    expect(moveGridIndex(0, 9, 'next-row', { cols, isDisabled })).toBe(null);
  });

  it('next / prev treat the grid as a flat list, wrapping at the global ends with loop', () => {
    expect(moveGridIndex(2, 9, 'next', { cols })).toBe(3);
    expect(moveGridIndex(3, 9, 'prev', { cols })).toBe(2);
    expect(moveGridIndex(0, 9, 'prev', { cols, loop: true })).toBe(8);
  });

  it('handles cols = 1 like a vertical list', () => {
    expect(moveGridIndex(0, 5, 'next-row', { cols: 1 })).toBe(1);
    expect(moveGridIndex(0, 5, 'next', { cols: 1 })).toBe(1);
  });
});
