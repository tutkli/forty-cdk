import { jumpPosition, pagePosition, trackPressDirection } from './track-press';

describe('track press geometry', () => {
  const geometry = { thumbSize: 50, usableTrack: 150, maxScroll: 600 } as const;

  it('reports a forward direction when the press lands after the thumb', () => {
    expect(trackPressDirection(120, 20, 50)).toBe(1);
  });

  it('reports a backward direction when the press lands before the thumb', () => {
    expect(trackPressDirection(10, 20, 50)).toBe(-1);
  });

  it('reports no direction when the press lands inside the thumb band', () => {
    expect(trackPressDirection(20, 20, 50)).toBe(0);
    expect(trackPressDirection(45, 20, 50)).toBe(0);
    expect(trackPressDirection(70, 20, 50)).toBe(0);
  });

  it('pages forward by one page step', () => {
    expect(pagePosition({ ...geometry, point: 1000, position: 0, pageStep: 175 }, 1)).toBe(175);
  });

  it('clamps the paged position so the thumb never moves past the press point', () => {
    const point = 60;
    const next = pagePosition({ ...geometry, point, position: 0, pageStep: 10_000 }, 1);

    expect(next).toBe(((point - geometry.thumbSize) * geometry.maxScroll) / geometry.usableTrack);
  });

  it('returns null once the thumb already covers the press point', () => {
    expect(pagePosition({ ...geometry, point: 30, position: 0, pageStep: 175 }, 1)).toBeNull();
  });

  it('returns null when the axis cannot scroll', () => {
    expect(
      pagePosition({ ...geometry, maxScroll: 0, point: 1000, position: 0, pageStep: 175 }, 1),
    ).toBeNull();
    expect(jumpPosition({ ...geometry, maxScroll: 0, point: 100 })).toBeNull();
  });

  it('returns null when the thumb fills the track', () => {
    expect(
      pagePosition({ ...geometry, usableTrack: 0, point: 1000, position: 0, pageStep: 175 }, 1),
    ).toBeNull();
    expect(jumpPosition({ ...geometry, usableTrack: 0, point: 100 })).toBeNull();
  });

  it('centres the thumb on the press point in jump mode', () => {
    expect(jumpPosition({ ...geometry, point: 100 })).toBe(300);
  });

  it('clamps a jump past either end of the track into the scroll range', () => {
    expect(jumpPosition({ ...geometry, point: -20 })).toBe(0);
    expect(jumpPosition({ ...geometry, point: 10_000 })).toBe(geometry.maxScroll);
  });

  it('pages backward without stepping below the start of the range', () => {
    expect(pagePosition({ ...geometry, point: 0, position: 100, pageStep: 175 }, -1)).toBe(0);
    expect(pagePosition({ ...geometry, point: 0, position: 0, pageStep: 175 }, -1)).toBeNull();
  });
});
