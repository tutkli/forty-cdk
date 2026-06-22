import { isRequiredInputUnset, tryReadHandle } from './read-handle';

function ng0950(): Error & { code: number } {
  const error = new Error('required input not set') as Error & { code: number };
  error.code = -950;
  return error;
}

describe('isRequiredInputUnset', () => {
  it('is true for an NG0950 RuntimeError (negative code)', () => {
    expect(isRequiredInputUnset(ng0950())).toBe(true);
  });

  it('is true for a positive 950 code', () => {
    const error = new Error('x') as Error & { code: number };
    error.code = 950;
    expect(isRequiredInputUnset(error)).toBe(true);
  });

  it('is false for a different RuntimeError code', () => {
    const error = new Error('x') as Error & { code: number };
    error.code = -200;
    expect(isRequiredInputUnset(error)).toBe(false);
  });

  it('is false for an error without a numeric code', () => {
    expect(isRequiredInputUnset(new Error('plain'))).toBe(false);
  });

  it('is false for a non-Error throw', () => {
    expect(isRequiredInputUnset('not-an-error')).toBe(false);
  });
});

describe('tryReadHandle', () => {
  it('returns the value when the read succeeds', () => {
    expect(tryReadHandle(() => 42)).toBe(42);
  });

  it('returns null on an NG0950 read', () => {
    expect(
      tryReadHandle(() => {
        throw ng0950();
      }),
    ).toBeNull();
  });

  it('rethrows a non-NG0950 error unchanged', () => {
    expect(() =>
      tryReadHandle(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
  });

  it('rethrows a non-Error throw', () => {
    expect(() =>
      tryReadHandle(() => {
        throw 'not-an-error';
      }),
    ).toThrow();
  });
});
