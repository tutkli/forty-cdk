import { flickVelocity } from './drawer-drag';

describe('flickVelocity', () => {
  it('keeps a fresh sample untouched (toward the edge)', () => {
    expect(flickVelocity(0.5, false)).toBe(0.5);
  });

  it('keeps a fresh sample untouched (away from the edge)', () => {
    expect(flickVelocity(-0.9, false)).toBe(-0.9);
  });

  it('zeroes a stale positive sample', () => {
    expect(flickVelocity(0.5, true)).toBe(0);
  });

  it('zeroes a stale negative sample', () => {
    expect(flickVelocity(-0.5, true)).toBe(0);
  });
});
