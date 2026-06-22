import type { ForDrawerSnapPoint } from './drawer-context';
import {
  computeSnapPositions,
  snapPointToFraction,
  validateSnapPointsShape,
  validateSnapPositions,
} from './snap-points';

describe('snapPointToFraction', () => {
  it('passes finite numbers through unchanged', () => {
    expect(snapPointToFraction(0, 1000)).toBe(0);
    expect(snapPointToFraction(0.5, 1000)).toBe(0.5);
    expect(snapPointToFraction(1, 1000)).toBe(1);
  });

  it('rejects NaN with the documented message', () => {
    expect(() => snapPointToFraction(Number.NaN, 1000)).toThrow(
      /\[forty-cdk\/drawer\] Snap point must be a finite number, got NaN/,
    );
  });

  it('rejects Infinity', () => {
    expect(() => snapPointToFraction(Number.POSITIVE_INFINITY, 1000)).toThrow(
      /must be a finite number/,
    );
  });

  it('parses percent strings', () => {
    expect(snapPointToFraction('25%', 1000)).toBe(0.25);
    expect(snapPointToFraction('100%', 1000)).toBe(1);
  });

  it('parses pixel strings against the supplied dimension', () => {
    expect(snapPointToFraction('200px', 1000)).toBe(0.2);
    expect(snapPointToFraction('200px', 400)).toBe(0.5);
  });

  it('returns 0 for px strings when dimension is 0 (deferred-measurement no-op)', () => {
    // No throw — caller will revalidate once the live dimension lands.
    expect(snapPointToFraction('200px', 0)).toBe(0);
  });

  it('rejects malformed strings', () => {
    expect(() => snapPointToFraction('foo' as unknown as ForDrawerSnapPoint, 1000)).toThrow(
      /must be a number, "NN%", or "NNpx"/,
    );
    expect(() => snapPointToFraction('200' as unknown as ForDrawerSnapPoint, 1000)).toThrow();
    expect(() => snapPointToFraction('px' as unknown as ForDrawerSnapPoint, 1000)).toThrow();
  });
});

describe('validateSnapPointsShape', () => {
  it('accepts a pure-fraction strictly-increasing array', () => {
    expect(() => validateSnapPointsShape([0.1, 0.5, 0.9])).not.toThrow();
  });

  it('accepts a pure-percent strictly-increasing array', () => {
    expect(() =>
      validateSnapPointsShape(['10%', '50%', '90%'] as ReadonlyArray<ForDrawerSnapPoint>),
    ).not.toThrow();
  });

  it('accepts a mixed number + percent array (both classify as fraction)', () => {
    expect(() =>
      validateSnapPointsShape([0.1, '50%', 0.9] as ReadonlyArray<ForDrawerSnapPoint>),
    ).not.toThrow();
  });

  it('accepts a pure-px strictly-increasing array', () => {
    expect(() =>
      validateSnapPointsShape(['100px', '200px', '300px'] as ReadonlyArray<ForDrawerSnapPoint>),
    ).not.toThrow();
  });

  it('rejects a pure-fraction non-monotonic array', () => {
    expect(() => validateSnapPointsShape([0.5, 0.3])).toThrow(/strictly increasing/);
  });

  it('rejects a pure-px non-monotonic array', () => {
    expect(() =>
      validateSnapPointsShape(['300px', '200px'] as ReadonlyArray<ForDrawerSnapPoint>),
    ).toThrow(/strictly increasing/);
  });

  it('rejects equal neighbours (strict, not weak, ordering)', () => {
    expect(() => validateSnapPointsShape([0.5, 0.5])).toThrow(/strictly increasing/);
  });

  it('rejects NaN entries before the monotonic check runs', () => {
    expect(() => validateSnapPointsShape([Number.NaN, 0.5])).toThrow(
      /must be a finite number, got NaN/,
    );
  });

  it("defers monotonic check on mixed 'NNpx' + fraction arrays", () => {
    // The mixed array `['200px', 0.5]` is non-monotonic at dim=300 but
    // monotonic at dim=1000. The shape check cannot decide either way and
    // must allow the input through; `validateSnapPositions` runs against
    // the live dimension instead.
    expect(() =>
      validateSnapPointsShape(['200px', 0.5] as ReadonlyArray<ForDrawerSnapPoint>),
    ).not.toThrow();
  });

  it('rejects single-entry arrays of malformed values', () => {
    expect(() =>
      validateSnapPointsShape(['bogus'] as unknown as ReadonlyArray<ForDrawerSnapPoint>),
    ).toThrow(/must be a number, "NN%", or "NNpx"/);
  });
});

describe('computeSnapPositions', () => {
  it('returns positions in CSS pixels measured from the anchored edge', () => {
    expect(computeSnapPositions([0.1, 0.5, 0.9], 1000)).toEqual([100, 500, 900]);
  });

  it('resolves percent strings as fractions of the dimension', () => {
    expect(computeSnapPositions(['25%', '50%'] as ReadonlyArray<ForDrawerSnapPoint>, 800)).toEqual([
      200, 400,
    ]);
  });

  it('resolves px strings as raw pixel offsets', () => {
    expect(
      computeSnapPositions(['100px', '300px'] as ReadonlyArray<ForDrawerSnapPoint>, 1000),
    ).toEqual([100, 300]);
  });

  it("does NOT throw on monotonicity violations — that's validateSnapPositions' job", () => {
    // 200px at dim=300 → 200; 0.5 * 300 → 150. Non-monotonic.
    // computeSnapPositions still returns the array; the caller decides
    // whether to validate.
    const positions = computeSnapPositions(
      ['200px', 0.5] as ReadonlyArray<ForDrawerSnapPoint>,
      300,
    );
    expect(positions).toEqual([200, 150]);
  });
});

describe('validateSnapPositions', () => {
  it('passes a strictly-increasing positions array', () => {
    expect(() =>
      validateSnapPositions(
        ['100px', '200px'] as ReadonlyArray<ForDrawerSnapPoint>,
        [100, 200],
        1000,
      ),
    ).not.toThrow();
  });

  it('throws with the offending point names, resolved px values, and dimension', () => {
    // Cross-dimension case: ['200px', 0.5] at dim=300 → [200, 150].
    expect(() =>
      validateSnapPositions(['200px', 0.5] as ReadonlyArray<ForDrawerSnapPoint>, [200, 150], 300),
    ).toThrow(
      '[forty-cdk/drawer] snap point 0.5 at index 1 resolves to 150px which is <= snap point "200px" at 200px (drawer dimension 300px).',
    );
  });

  it('rejects equal neighbours (strict ordering)', () => {
    expect(() =>
      validateSnapPositions(
        ['100px', '100px'] as ReadonlyArray<ForDrawerSnapPoint>,
        [100, 100],
        1000,
      ),
    ).toThrow(/resolves to 100px which is <= snap point "100px" at 100px/);
  });

  it('reports the first offending pair when multiple are out of order', () => {
    expect(() =>
      validateSnapPositions(
        [0.1, 0.05, 0.5] as ReadonlyArray<ForDrawerSnapPoint>,
        [100, 50, 500],
        1000,
      ),
    ).toThrow(
      '[forty-cdk/drawer] snap point 0.05 at index 1 resolves to 50px which is <= snap point 0.1 at 100px (drawer dimension 1000px).',
    );
  });

  it('passes empty / single-element arrays without throwing', () => {
    expect(() =>
      validateSnapPositions([] as ReadonlyArray<ForDrawerSnapPoint>, [], 1000),
    ).not.toThrow();
    expect(() =>
      validateSnapPositions([0.5] as ReadonlyArray<ForDrawerSnapPoint>, [500], 1000),
    ).not.toThrow();
  });
});
