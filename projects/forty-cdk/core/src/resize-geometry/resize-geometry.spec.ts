import { clampToRange, roundToStepPrecision } from './resize-geometry';

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
