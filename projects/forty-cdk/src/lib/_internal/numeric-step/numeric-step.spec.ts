import { clamp, roundToStepPrecision, snapToStep } from './numeric-step';

describe('clamp', () => {
  it('clamps below min to min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('clamps above max to max', () => {
    expect(clamp(200, 0, 100)).toBe(100);
  });

  it('passes through an in-range value', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('treats Infinity bounds as unbounded', () => {
    expect(clamp(999999, -Infinity, Infinity)).toBe(999999);
  });
});

describe('roundToStepPrecision', () => {
  it('returns the value unchanged for an integer step', () => {
    expect(roundToStepPrecision(10.7, 1)).toBe(10.7);
  });

  it('rounds 0.1-step accumulation noise to one decimal place', () => {
    expect(roundToStepPrecision(0.1 + 0.1 + 0.1, 0.1)).toBe(0.3);
  });

  it('rounds to the decimal precision the step carries', () => {
    expect(roundToStepPrecision(0.1 + 0.2, 0.01)).toBe(0.3);
  });
});

describe('snapToStep', () => {
  it('snaps an off-grid value onto the nearest step from min', () => {
    expect(snapToStep(23, 10, 0)).toBe(20);
  });

  it('snaps relative to a non-zero min', () => {
    expect(snapToStep(7, 5, 1)).toBe(6);
  });

  it('emits a clean 0.3 for a 0.1 step instead of float noise', () => {
    expect(snapToStep(0.30000000000000004, 0.1, 0)).toBe(0.3);
  });

  it('returns the raw value when step is not positive', () => {
    expect(snapToStep(23.7, 0, 0)).toBe(23.7);
  });
});
