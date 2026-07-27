import { resolveSnapTarget } from './snap-target';

describe('resolveSnapTarget', () => {
  it('snaps to the closest snap point at low velocity', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      activeSnapPoint: 0.5,
      position: 380,
      velocity: 0.05,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(0.5);
  });

  it('biases one snap further on a fast positive velocity (away from edge)', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      activeSnapPoint: 0.5,
      position: 410,
      velocity: 1, // fast away from edge
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(1);
  });

  it('biases one snap closer on a fast negative velocity (toward edge)', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      activeSnapPoint: 0.5,
      position: 380,
      velocity: -1, // fast toward edge
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(0.25);
  });

  it('dismisses when released past closeThreshold from the closest-to-edge snap', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      activeSnapPoint: 0.25,
      position: -50, // way past the lowest snap, toward the edge
      velocity: 0,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(true);
    expect(r.nextSnapPoint).toBe(null);
  });

  it('throws when called with no snap points (the no-snap case is the caller’s responsibility)', () => {
    expect(() =>
      resolveSnapTarget({
        snapPoints: [] as const,
        snapPositions: [],
        activeSnapPoint: null,
        position: 100,
        velocity: 0,
        closeThreshold: 0.25,
      }),
    ).toThrow(/at least one snap point/);
  });

  it('does NOT dismiss when released past the threshold but a higher snap is closer', () => {
    // closestIdx will be index 1 (400) â€” dismiss check only runs when target == 0.
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      activeSnapPoint: 0.5,
      position: 350,
      velocity: 0,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(0.5);
  });

  it('dismisses from a small "peek" snap on a modest drag (the threshold scales to the lowest snap, not the full dimension)', () => {
    // Playground-shaped config: a 148px peek on a tall 650px sheet. The old
    // formula (lowestPos - dimension * closeThreshold = 148 - 650 * 0.25 =
    // -14.5) made the dismiss threshold negative, so the surface had to be
    // dragged entirely off-screen to close. The threshold is now a fraction
    // of the peek's own extent: 148 * (1 - 0.25) = 111.
    const r = resolveSnapTarget({
      snapPoints: ['148px', 0.5, 1] as const,
      snapPositions: [148, 325, 650],
      activeSnapPoint: '148px',
      position: 90, // peek dragged down 58px — nowhere near off-screen
      velocity: 0,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(true);
    expect(r.nextSnapPoint).toBe(null);
  });

  it('snaps back to the peek (does not dismiss) when the drag stays short of the threshold', () => {
    // Same 148px peek; a 25px drag (position 123) stays above the 111 dismiss
    // threshold, so the release settles back on the peek instead of closing.
    const r = resolveSnapTarget({
      snapPoints: ['148px', 0.5, 1] as const,
      snapPositions: [148, 325, 650],
      activeSnapPoint: '148px',
      position: 123,
      velocity: 0,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe('148px');
  });
});
