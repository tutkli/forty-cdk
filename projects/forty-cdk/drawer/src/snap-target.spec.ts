import { resolveSnapTarget } from './snap-target';

describe('resolveSnapTarget', () => {
  it('snaps to the closest snap point at low velocity', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      position: 380,
      velocity: 0.05,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(0.5);
  });

  it('a fast away-from-edge flick targets the first snap above the release position', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      position: 410,
      velocity: 1, // fast away from edge
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(1);
  });

  it('a fast toward-edge flick targets the first snap below the release position', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      position: 380,
      velocity: -1, // fast toward edge
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(0.25);
  });

  it('a toward-edge flick released below every snap dismisses', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      position: -50,
      velocity: -1,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(true);
    expect(r.nextSnapPoint).toBe(null);
  });

  it('a toward-edge flick released several snaps down lands on the first snap below the release', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      position: 300,
      velocity: -1,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(0.25);
  });

  it('an away flick released at the highest snap stays on it', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      position: 800,
      velocity: 1,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(1);
  });

  it('an away flick released several snaps up lands on the first snap above the release', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      position: 500,
      velocity: 1,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(1);
  });

  it('a toward-edge flick just below the lowest snap dismisses short of closeThreshold, as a flick does without snap points', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      position: 190,
      velocity: -1,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(true);
    expect(r.nextSnapPoint).toBe(null);
  });

  it('dismisses when released past closeThreshold from the closest-to-edge snap', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
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
        position: 100,
        velocity: 0,
        closeThreshold: 0.25,
      }),
    ).toThrow(/FORCDK-DRAWER-012: resolveSnapTarget received no snap points/);
  });

  it('does NOT dismiss when released past the threshold but a higher snap is closer', () => {
    // closestIdx will be index 1 (400) â€” dismiss check only runs when target == 0.
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
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
      position: 123,
      velocity: 0,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe('148px');
  });
});
