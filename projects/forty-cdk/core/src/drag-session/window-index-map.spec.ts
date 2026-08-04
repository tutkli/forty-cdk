import { resolveScrubReorder, translateWindowReorder } from './window-index-map';

describe('translateWindowReorder', () => {
  it('is the identity when the window spans the whole dataset (contiguous from 0)', () => {
    expect(translateWindowReorder([0, 1, 2, 3, 4], 0, 2)).toEqual({ from: 0, to: 2 });
    expect(translateWindowReorder([0, 1, 2, 3, 4], 3, 1)).toEqual({ from: 3, to: 1 });
    expect(translateWindowReorder([0, 1, 2, 3, 4], 1, 4)).toEqual({ from: 1, to: 4 });
  });

  it('maps a contiguous mid-dataset window to absolute indices', () => {
    expect(translateWindowReorder([50, 51, 52, 53, 54], 1, 2)).toEqual({ from: 51, to: 52 });
    expect(translateWindowReorder([50, 51, 52, 53, 54], 0, 3)).toEqual({ from: 50, to: 53 });
  });

  it('handles a non-contiguous window (pinned lifted row far from the visible block)', () => {
    expect(translateWindowReorder([3, 80, 81, 82, 83], 0, 2)).toEqual({ from: 3, to: 81 });
    expect(translateWindowReorder([3, 80, 81, 82, 83], 0, 4)).toEqual({ from: 3, to: 83 });
  });

  it('returns a no-op move for a single-row window', () => {
    expect(translateWindowReorder([7], 0, 0)).toEqual({ from: 7, to: 7 });
  });

  it('appends past the window end, shifting indices above the lifted row down by one', () => {
    expect(translateWindowReorder([50, 51, 52, 53, 54], 0, 5)).toEqual({ from: 50, to: 54 });
    expect(translateWindowReorder([50, 51, 52, 53, 54], 2, 5)).toEqual({ from: 52, to: 54 });
  });

  it('applies the post-removal shift only to indices above the lifted row', () => {
    expect(translateWindowReorder([10, 11, 12, 13], 3, 0)).toEqual({ from: 13, to: 10 });
    expect(translateWindowReorder([10, 11, 12, 13], 3, 2)).toEqual({ from: 13, to: 12 });
    expect(translateWindowReorder([10, 11, 12, 13], 0, 2)).toEqual({ from: 10, to: 12 });
  });
});

describe('resolveScrubReorder', () => {
  const base = {
    engaged: true,
    viewportStart: 100,
    viewportEnd: 500,
    from: 50,
    count: 10_000,
  };

  it('returns null when the scrub affordance is not engaged', () => {
    expect(resolveScrubReorder({ ...base, engaged: false, pointer: 300 })).toBeNull();
  });

  it('returns null for an empty dataset or a degenerate viewport', () => {
    expect(resolveScrubReorder({ ...base, count: 0, pointer: 300 })).toBeNull();
    expect(resolveScrubReorder({ ...base, viewportEnd: 100, pointer: 300 })).toBeNull();
  });

  it('maps the viewport start edge to the first dataset index', () => {
    expect(resolveScrubReorder({ ...base, pointer: 100 })).toEqual({ from: 50, to: 0 });
  });

  it('maps the viewport end edge to the last dataset index, shifted past the removed row', () => {
    expect(resolveScrubReorder({ ...base, pointer: 500 })).toEqual({ from: 50, to: 9998 });
  });

  it('maps a mid-viewport pointer to the proportional far index', () => {
    expect(resolveScrubReorder({ ...base, pointer: 300 })).toEqual({ from: 50, to: 4999 });
  });

  it('clamps a pointer beyond either edge to the dataset bounds', () => {
    expect(resolveScrubReorder({ ...base, pointer: 40 })).toEqual({ from: 50, to: 0 });
    expect(resolveScrubReorder({ ...base, pointer: 9000 })).toEqual({ from: 50, to: 9998 });
  });

  it('does not shift a target at or below the lifted row', () => {
    expect(
      resolveScrubReorder({ ...base, viewportStart: 0, viewportEnd: 100, pointer: 0 }),
    ).toEqual({ from: 50, to: 0 });
  });
});
