import { attachSwipeDismiss, type SwipeDirection, type SwipeEventDetail } from './swipe-dismiss';

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

  it('crosses the threshold → swipeEnd; below threshold → swipeCancel', () => {
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
    // Dominant axis is vertical → not allowed → no arming.
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
