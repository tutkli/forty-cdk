import { computeScrollVelocity, createAutoScroller } from './auto-scroll';

describe('computeScrollVelocity', () => {
  const rect = { left: 0, top: 0, right: 400, bottom: 300 };
  const edgeSize = 50;
  const maxSpeed = 20;

  it('returns zero velocity for a point at the centre', () => {
    const v = computeScrollVelocity(rect, { x: 200, y: 150 }, edgeSize, maxSpeed);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('point near the bottom edge → y > 0 and y <= maxSpeed; x === 0', () => {
    const v = computeScrollVelocity(rect, { x: 200, y: 280 }, edgeSize, maxSpeed);
    expect(v.x).toBe(0);
    expect(v.y).toBeGreaterThan(0);
    expect(v.y).toBeLessThanOrEqual(maxSpeed);
  });

  it('point near the top edge → y < 0 and y >= -maxSpeed', () => {
    const v = computeScrollVelocity(rect, { x: 200, y: 20 }, edgeSize, maxSpeed);
    expect(v.y).toBeLessThan(0);
    expect(v.y).toBeGreaterThanOrEqual(-maxSpeed);
  });

  it('point near the right edge → x > 0', () => {
    const v = computeScrollVelocity(rect, { x: 390, y: 150 }, edgeSize, maxSpeed);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBe(0);
  });

  it('point near the left edge → x < 0', () => {
    const v = computeScrollVelocity(rect, { x: 10, y: 150 }, edgeSize, maxSpeed);
    expect(v.x).toBeLessThan(0);
    expect(v.y).toBe(0);
  });

  it('proximity scaling: exactly at the bottom edge yields larger magnitude than half edgeSize inside', () => {
    const atEdge = computeScrollVelocity(rect, { x: 200, y: 300 }, edgeSize, maxSpeed);
    const halfInside = computeScrollVelocity(rect, { x: 200, y: 275 }, edgeSize, maxSpeed);
    expect(Math.abs(atEdge.y)).toBeGreaterThan(Math.abs(halfInside.y));
  });

  it('edgeSize = 0 → zero velocity regardless of position', () => {
    const v = computeScrollVelocity(rect, { x: 200, y: 299 }, 0, maxSpeed);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('point outside the rect on y → 0 on y axis', () => {
    const v = computeScrollVelocity(rect, { x: 200, y: 400 }, edgeSize, maxSpeed);
    expect(v.y).toBe(0);
  });

  it('point outside the rect on x → 0 on x axis', () => {
    const v = computeScrollVelocity(rect, { x: -10, y: 150 }, edgeSize, maxSpeed);
    expect(v.x).toBe(0);
  });
});

describe('createAutoScroller — SSR / no-window no-op', () => {
  const host = document.createElement('div');

  it('returns a no-op when win is null', () => {
    const scroller = createAutoScroller({
      host,
      win: null,
      edgeSize: 50,
      maxSpeed: 16,
      onFrame: () => {},
    });
    expect(() => scroller.update({ x: 10, y: 10 })).not.toThrow();
    expect(() => scroller.stop()).not.toThrow();
  });

  it('returns a no-op when win has no requestAnimationFrame', () => {
    const fakeWin = {} as unknown as Window;
    const scroller = createAutoScroller({
      host,
      win: fakeWin,
      edgeSize: 50,
      maxSpeed: 16,
      onFrame: () => {},
    });
    expect(() => scroller.update({ x: 10, y: 10 })).not.toThrow();
    expect(() => scroller.stop()).not.toThrow();
  });
});

describe('createAutoScroller — resolveScrollHost follows the pointer across containers', () => {
  function scrollableAt(rect: { left: number; top: number; right: number; bottom: number }) {
    const el = document.createElement('div') as unknown as HTMLElement & { topDelta: number };
    el.style.overflowY = 'auto';
    el.style.overflowX = 'auto';
    Object.defineProperty(el, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(el, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 100, configurable: true });
    let top = 0;
    el.topDelta = 0;
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (v: number) => {
        el.topDelta += v - top;
        top = v;
      },
    });
    Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true, configurable: true });
    el.getBoundingClientRect = () =>
      ({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        x: rect.left,
        y: rect.top,
        toJSON() {},
      }) as DOMRect;
    document.body.appendChild(el);
    return el;
  }

  const created: HTMLElement[] = [];

  function makeWin(pending: { cb: FrameRequestCallback | null }): Window {
    return {
      requestAnimationFrame(cb: FrameRequestCallback): number {
        pending.cb = cb;
        return 1;
      },
      cancelAnimationFrame(): void {
        pending.cb = null;
      },
      getComputedStyle: (el: Element) => window.getComputedStyle(el),
      get document() {
        return document;
      },
    } as unknown as Window;
  }

  function step(pending: { cb: FrameRequestCallback | null }): void {
    const cb = pending.cb;
    pending.cb = null;
    cb?.(0);
  }

  afterEach(() => {
    for (const el of created.splice(0)) {
      el.remove();
    }
  });

  it('scrolls the destination container the pointer is over, not the origin', () => {
    const source = scrollableAt({ left: 0, top: 0, right: 100, bottom: 100 });
    const dest = scrollableAt({ left: 200, top: 0, right: 300, bottom: 100 });
    created.push(source, dest);

    const pending: { cb: FrameRequestCallback | null } = { cb: null };
    let over: HTMLElement = source;
    const scroller = createAutoScroller({
      host: source,
      win: makeWin(pending),
      edgeSize: 30,
      maxSpeed: 20,
      onFrame: () => {},
      resolveScrollHost: () => over,
    });

    scroller.update({ x: 50, y: 95 });
    step(pending);
    expect(source.topDelta).toBeGreaterThan(0);
    expect(dest.topDelta).toBe(0);

    source.topDelta = 0;

    over = dest;
    scroller.update({ x: 250, y: 95 });
    step(pending);
    expect(dest.topDelta).toBeGreaterThan(0);
    expect(source.topDelta).toBe(0);

    scroller.stop();
  });
});
