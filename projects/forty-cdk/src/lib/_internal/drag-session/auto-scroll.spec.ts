import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

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

describe('computeScrollVelocity — zoneless guard', () => {
  it('pure velocity math works under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const rect = { left: 0, top: 0, right: 200, bottom: 200 };
    const v = computeScrollVelocity(rect, { x: 100, y: 190 }, 50, 20);
    expect(v.x).toBe(0);
    expect(v.y).toBeGreaterThan(0);
  });
});
