import {
  attachSwipeDismiss,
  resolveSnapTarget,
  type SwipeDirection,
  type SwipeEventDetail,
} from './swipe-dismiss';

function pointer(
  el: HTMLElement | Window,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: {
    clientX?: number;
    clientY?: number;
    pointerId?: number;
    button?: number;
    pointerType?: string;
  } = {},
): PointerEvent {
  const ev = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    pointerId: init.pointerId ?? 1,
    button: init.button ?? 0,
    pointerType: init.pointerType ?? 'touch',
  });
  el.dispatchEvent(ev);
  return ev;
}

interface Recorder {
  starts: SwipeEventDetail[];
  moves: SwipeEventDetail[];
  ends: SwipeEventDetail[];
  cancels: SwipeEventDetail[];
}

function setup(
  options: {
    directions?: readonly SwipeDirection[];
    threshold?: number;
  } = {},
): { el: HTMLElement; rec: Recorder; cleanup: () => void } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const rec: Recorder = { starts: [], moves: [], ends: [], cancels: [] };
  const cleanup = attachSwipeDismiss({
    element: el,
    getDirections: () => options.directions ?? ['right'],
    getThreshold: () => options.threshold ?? 50,
    onSwipeStart: (d) => rec.starts.push(d),
    onSwipeMove: (d) => rec.moves.push(d),
    onSwipeEnd: (d) => rec.ends.push(d),
    onSwipeCancel: (d) => rec.cancels.push(d),
  });
  return {
    el,
    rec,
    cleanup: () => {
      cleanup();
      el.remove();
    },
  };
}

describe('attachSwipeDismiss', () => {
  it('does not fire any callback for a tap (pointerdown / pointerup with no movement)', () => {
    const { el, rec, cleanup } = setup();
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(el, 'pointerup', { clientX: 0, clientY: 0 });
    expect(rec.starts).toEqual([]);
    expect(rec.moves).toEqual([]);
    expect(rec.ends).toEqual([]);
    expect(rec.cancels).toEqual([]);
    cleanup();
  });

  it('does not arm below the internal arm distance', () => {
    const { el, rec, cleanup } = setup();
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(el, 'pointermove', { clientX: 2, clientY: 0 });
    pointer(el, 'pointerup', { clientX: 2, clientY: 0 });
    expect(rec.starts).toEqual([]);
    expect(rec.moves).toEqual([]);
    expect(rec.ends).toEqual([]);
    expect(rec.cancels).toEqual([]);
    cleanup();
  });

  it('fires swipeStart + swipeMove on the arming move with constrained delta', () => {
    const { el, rec, cleanup } = setup({ directions: ['right'] });
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(el, 'pointermove', { clientX: 10, clientY: 3 });
    expect(rec.starts).toHaveLength(1);
    expect(rec.starts[0]!.direction).toBe('right');
    expect(rec.starts[0]!.delta).toEqual({ x: 10, y: 0 });
    expect(rec.moves).toHaveLength(1);
    expect(rec.moves[0]!.delta).toEqual({ x: 10, y: 0 });
    cleanup();
  });

  it('crosses the threshold â†’ swipeEnd; below threshold â†’ swipeCancel', () => {
    const a = setup({ directions: ['right'], threshold: 50 });
    pointer(a.el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(a.el, 'pointermove', { clientX: 60, clientY: 0 });
    pointer(a.el, 'pointerup', { clientX: 60, clientY: 0 });
    expect(a.rec.ends).toHaveLength(1);
    expect(a.rec.cancels).toEqual([]);
    a.cleanup();

    const b = setup({ directions: ['right'], threshold: 50 });
    pointer(b.el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(b.el, 'pointermove', { clientX: 30, clientY: 0 });
    pointer(b.el, 'pointerup', { clientX: 30, clientY: 0 });
    expect(b.rec.ends).toEqual([]);
    expect(b.rec.cancels).toHaveLength(1);
    b.cleanup();
  });

  it('ignores gestures whose dominant direction is not in the allowed set', () => {
    const { el, rec, cleanup } = setup({ directions: ['right'] });
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    // Dominant axis is vertical â†’ not allowed â†’ no arming.
    pointer(el, 'pointermove', { clientX: 5, clientY: 60 });
    pointer(el, 'pointerup', { clientX: 5, clientY: 60 });
    expect(rec.starts).toEqual([]);
    expect(rec.ends).toEqual([]);
    expect(rec.cancels).toEqual([]);
    cleanup();
  });

  it('left direction sees negative-x movement and threshold is checked on absolute projection', () => {
    const { el, rec, cleanup } = setup({ directions: ['left'], threshold: 40 });
    pointer(el, 'pointerdown', { clientX: 100, clientY: 0 });
    pointer(el, 'pointermove', { clientX: 50, clientY: 0 });
    pointer(el, 'pointerup', { clientX: 50, clientY: 0 });
    expect(rec.starts[0]!.direction).toBe('left');
    expect(rec.starts[0]!.delta).toEqual({ x: -50, y: 0 });
    expect(rec.ends).toHaveLength(1);
    cleanup();
  });

  it('clamps perpendicular axis to 0 in the emitted delta', () => {
    const { el, rec, cleanup } = setup({ directions: ['down'], threshold: 30 });
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(el, 'pointermove', { clientX: 12, clientY: 40 });
    pointer(el, 'pointerup', { clientX: 12, clientY: 40 });
    expect(rec.moves.at(-1)!.delta).toEqual({ x: 0, y: 40 });
    expect(rec.ends).toHaveLength(1);
    cleanup();
  });

  it('pointercancel always fires swipeCancel when armed', () => {
    const { el, rec, cleanup } = setup({ directions: ['right'], threshold: 50 });
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(el, 'pointermove', { clientX: 80, clientY: 0 });
    pointer(el, 'pointercancel', { clientX: 80, clientY: 0 });
    expect(rec.cancels).toHaveLength(1);
    expect(rec.ends).toEqual([]);
    cleanup();
  });

  it('pointercancel releases the captured pointer (guarded by hasPointerCapture)', () => {
    const { el, rec, cleanup } = setup({ directions: ['right'], threshold: 50 });
    const captured: number[] = [];
    const released: number[] = [];
    el.setPointerCapture = (id: number): void => {
      captured.push(id);
    };
    el.hasPointerCapture = (id: number): boolean => captured.includes(id) && !released.includes(id);
    el.releasePointerCapture = (id: number): void => {
      released.push(id);
    };

    pointer(el, 'pointerdown', { clientX: 0, clientY: 0, pointerId: 1 });
    pointer(el, 'pointermove', { clientX: 80, clientY: 0, pointerId: 1 });
    expect(captured).toEqual([1]);

    pointer(el, 'pointercancel', { clientX: 80, clientY: 0, pointerId: 1 });
    expect(released).toEqual([1]);
    expect(rec.cancels).toHaveLength(1);
    cleanup();
  });

  it('a mid-gesture direction change to empty aborts the armed swipe', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const rec: Recorder = { starts: [], moves: [], ends: [], cancels: [] };
    let directions: readonly SwipeDirection[] = ['right'];
    const released: number[] = [];
    el.setPointerCapture = (): void => {};
    el.hasPointerCapture = (id: number): boolean => !released.includes(id);
    el.releasePointerCapture = (id: number): void => {
      released.push(id);
    };
    const dispose = attachSwipeDismiss({
      element: el,
      getDirections: () => directions,
      getThreshold: () => 50,
      onSwipeStart: (d) => rec.starts.push(d),
      onSwipeMove: (d) => rec.moves.push(d),
      onSwipeEnd: (d) => rec.ends.push(d),
      onSwipeCancel: (d) => rec.cancels.push(d),
    });

    // Arm the swipe while 'right' is allowed.
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0, pointerId: 1 });
    pointer(el, 'pointermove', { clientX: 20, clientY: 0, pointerId: 1 });
    expect(rec.starts).toHaveLength(1);
    expect(rec.moves).toHaveLength(1);

    // Toggle the allowed set to empty mid-gesture.
    directions = [];
    pointer(el, 'pointermove', { clientX: 40, clientY: 0, pointerId: 1 });

    // The armed swipe aborts: cancel fires, capture is released, and no
    // further move is emitted.
    expect(rec.cancels).toHaveLength(1);
    expect(rec.cancels[0]!.direction).toBe('right');
    expect(rec.moves).toHaveLength(1);
    expect(released).toEqual([1]);

    // A subsequent move on the now-dead gesture is silent (state was reset).
    pointer(el, 'pointermove', { clientX: 60, clientY: 0, pointerId: 1 });
    expect(rec.moves).toHaveLength(1);
    expect(rec.cancels).toHaveLength(1);

    dispose();
    el.remove();
  });

  it('returning empty directions disables swipe', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const rec: Recorder = { starts: [], moves: [], ends: [], cancels: [] };
    let directions: readonly SwipeDirection[] = [];
    const dispose = attachSwipeDismiss({
      element: el,
      getDirections: () => directions,
      getThreshold: () => 50,
      onSwipeStart: (d) => rec.starts.push(d),
      onSwipeMove: (d) => rec.moves.push(d),
      onSwipeEnd: (d) => rec.ends.push(d),
      onSwipeCancel: (d) => rec.cancels.push(d),
    });

    pointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(el, 'pointermove', { clientX: 80, clientY: 0 });
    pointer(el, 'pointerup', { clientX: 80, clientY: 0 });
    expect(rec.starts).toEqual([]);

    // Re-enable, gesture from scratch should arm.
    directions = ['right'];
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(el, 'pointermove', { clientX: 80, clientY: 0 });
    pointer(el, 'pointerup', { clientX: 80, clientY: 0 });
    expect(rec.ends).toHaveLength(1);

    dispose();
    el.remove();
  });

  it('mouse non-primary button is ignored', () => {
    const { el, rec, cleanup } = setup({ directions: ['right'] });
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0, button: 2, pointerType: 'mouse' });
    pointer(el, 'pointermove', { clientX: 80, clientY: 0, pointerType: 'mouse' });
    pointer(el, 'pointerup', { clientX: 80, clientY: 0, pointerType: 'mouse' });
    expect(rec.starts).toEqual([]);
    expect(rec.ends).toEqual([]);
    cleanup();
  });

  it('ignores a second pointerdown mid-gesture so the first pointer still ends the swipe', () => {
    const { el, rec, cleanup } = setup({ directions: ['right'], threshold: 50 });
    // Arm with pointer 1.
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0, pointerId: 1 });
    pointer(el, 'pointermove', { clientX: 60, clientY: 0, pointerId: 1 });
    expect(rec.starts).toHaveLength(1);

    // A second pointer touches down mid-gesture: it must NOT take over tracking.
    pointer(el, 'pointerdown', { clientX: 200, clientY: 200, pointerId: 2 });
    // The second pointer's moves are ignored (still tracking pointer 1).
    pointer(el, 'pointermove', { clientX: 240, clientY: 200, pointerId: 2 });
    expect(rec.moves.every((d) => d.originalEvent.pointerId === 1)).toBe(true);

    // Pointer 1's pointerup is honored and ends the swipe past the threshold.
    pointer(el, 'pointerup', { clientX: 60, clientY: 0, pointerId: 1 });
    expect(rec.ends).toHaveLength(1);
    expect(rec.cancels).toEqual([]);
    cleanup();
  });

  it('does not release the first pointer capture when a second pointerdown arrives', () => {
    const { el, rec, cleanup } = setup({ directions: ['right'], threshold: 50 });
    const captured: number[] = [];
    const released: number[] = [];
    el.setPointerCapture = (id: number): void => {
      captured.push(id);
    };
    el.hasPointerCapture = (id: number): boolean => captured.includes(id) && !released.includes(id);
    el.releasePointerCapture = (id: number): void => {
      released.push(id);
    };

    pointer(el, 'pointerdown', { clientX: 0, clientY: 0, pointerId: 1 });
    pointer(el, 'pointermove', { clientX: 60, clientY: 0, pointerId: 1 });
    expect(captured).toEqual([1]);

    pointer(el, 'pointerdown', { clientX: 200, clientY: 200, pointerId: 2 });
    // The first pointer's capture is untouched (no orphaned capture).
    expect(released).toEqual([]);

    pointer(el, 'pointerup', { clientX: 60, clientY: 0, pointerId: 1 });
    expect(released).toEqual([1]);
    expect(rec.ends).toHaveLength(1);
    cleanup();
  });

  it('cleanup removes listeners and a follow-up gesture is silent', () => {
    const { el, rec, cleanup } = setup();
    cleanup();
    pointer(el, 'pointerdown', { clientX: 0, clientY: 0 });
    pointer(el, 'pointermove', { clientX: 80, clientY: 0 });
    pointer(el, 'pointerup', { clientX: 80, clientY: 0 });
    expect(rec.starts).toEqual([]);
    expect(rec.moves).toEqual([]);
    expect(rec.ends).toEqual([]);
    expect(rec.cancels).toEqual([]);
  });
});

describe('resolveSnapTarget', () => {
  it('snaps to the closest snap point at low velocity', () => {
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      activeSnapPoint: 0.5,
      position: 380,
      velocity: 0.05,
      dimension: 800,
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
      dimension: 800,
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
      dimension: 800,
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
      dimension: 800,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(true);
    expect(r.nextSnapPoint).toBe(null);
  });

  it('does NOT dismiss when released past the threshold but a higher snap is closer', () => {
    // closestIdx will be index 1 (400) â€” dismiss check only runs when target == 0.
    const r = resolveSnapTarget({
      snapPoints: [0.25, 0.5, 1] as const,
      snapPositions: [200, 400, 800],
      activeSnapPoint: 0.5,
      position: 350,
      velocity: 0,
      dimension: 800,
      closeThreshold: 0.25,
    });
    expect(r.willClose).toBe(false);
    expect(r.nextSnapPoint).toBe(0.5);
  });
});
