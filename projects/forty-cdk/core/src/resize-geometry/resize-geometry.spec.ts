import {
  clampToRange,
  DRAG_DEAD_ZONE_PX,
  roundToStepPrecision,
  startPointerResize,
} from './resize-geometry';

function pointerEvent(
  type: string,
  init: { clientX?: number; clientY?: number; button?: number; pointerId?: number } = {},
): PointerEvent {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.defineProperty(ev, 'clientX', { value: init.clientX ?? 0 });
  Object.defineProperty(ev, 'clientY', { value: init.clientY ?? 0 });
  Object.defineProperty(ev, 'button', { value: init.button ?? 0 });
  Object.defineProperty(ev, 'pointerId', { value: init.pointerId ?? 1 });
  return ev;
}

describe('clampToRange', () => {
  it('clamps below min to min', () => {
    expect(clampToRange(-5, 0, 100)).toBe(0);
  });

  it('clamps above max to max', () => {
    expect(clampToRange(200, 0, 100)).toBe(100);
  });

  it('passes through an in-range value', () => {
    expect(clampToRange(50, 0, 100)).toBe(50);
  });

  it('passes large values through when max is Infinity', () => {
    expect(clampToRange(999999, 0, Infinity)).toBe(999999);
  });
});

describe('roundToStepPrecision', () => {
  it('returns the value unchanged for an integer step', () => {
    expect(roundToStepPrecision(10.7, 1)).toBe(10.7);
  });

  it('rounds 0.1-step accumulation noise to one decimal place', () => {
    const accumulated = 0.1 + 0.1 + 0.1;
    expect(roundToStepPrecision(accumulated, 0.1)).toBe(0.3);
  });
});

describe('startPointerResize', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
    el.setPointerCapture = () => {};
    el.hasPointerCapture = () => false;
    el.releasePointerCapture = () => {};
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('does not call onResize for a sub-dead-zone move', () => {
    const onResize = vi.fn();
    const onCommit = vi.fn();

    startPointerResize(pointerEvent('pointerdown', { clientX: 100 }), {
      host: el,
      axis: 'x',
      startValue: 200,
      invert: false,
      constrain: (n) => n,
      onResize,
      onCommit,
    });

    el.dispatchEvent(pointerEvent('pointermove', { clientX: 100 + DRAG_DEAD_ZONE_PX - 1 }));
    expect(onResize).not.toHaveBeenCalled();
  });

  it('calls onResize with the constrained value after crossing the dead-zone', () => {
    const onResize = vi.fn();
    startPointerResize(pointerEvent('pointerdown', { clientX: 100 }), {
      host: el,
      axis: 'x',
      startValue: 200,
      invert: false,
      constrain: (n) => Math.min(n, 300),
      onResize,
      onCommit: vi.fn(),
    });

    el.dispatchEvent(pointerEvent('pointermove', { clientX: 110 }));
    expect(onResize).toHaveBeenCalledWith(210);
  });

  it('fires onCommit exactly once on pointerup when armed', () => {
    const onCommit = vi.fn();
    startPointerResize(pointerEvent('pointerdown', { clientX: 100 }), {
      host: el,
      axis: 'x',
      startValue: 200,
      invert: false,
      constrain: (n) => n,
      onResize: vi.fn(),
      onCommit,
    });

    el.dispatchEvent(pointerEvent('pointermove', { clientX: 120 }));
    el.dispatchEvent(pointerEvent('pointerup', { clientX: 120 }));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(220);
  });

  it('does not call onCommit on a no-op click (no move past dead-zone)', () => {
    const onCommit = vi.fn();
    startPointerResize(pointerEvent('pointerdown', { clientX: 100 }), {
      host: el,
      axis: 'x',
      startValue: 200,
      invert: false,
      constrain: (n) => n,
      onResize: vi.fn(),
      onCommit,
    });

    el.dispatchEvent(pointerEvent('pointerup', { clientX: 100 }));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('inverts the delta sign when invert is true', () => {
    const onResize = vi.fn();
    startPointerResize(pointerEvent('pointerdown', { clientX: 100 }), {
      host: el,
      axis: 'x',
      startValue: 200,
      invert: true,
      constrain: (n) => n,
      onResize,
      onCommit: vi.fn(),
    });

    el.dispatchEvent(pointerEvent('pointermove', { clientX: 120 }));
    expect(onResize).toHaveBeenCalledWith(180);
  });

  it('teardown removes the listeners: a subsequent pointermove does nothing', () => {
    const onResize = vi.fn();
    const teardown = startPointerResize(pointerEvent('pointerdown', { clientX: 100 }), {
      host: el,
      axis: 'x',
      startValue: 200,
      invert: false,
      constrain: (n) => n,
      onResize,
      onCommit: vi.fn(),
    });

    teardown();
    el.dispatchEvent(pointerEvent('pointermove', { clientX: 150 }));
    expect(onResize).not.toHaveBeenCalled();
  });
});
