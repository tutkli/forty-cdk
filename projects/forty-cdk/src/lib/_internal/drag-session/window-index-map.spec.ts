import { translateWindowReorder } from './window-index-map';

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
