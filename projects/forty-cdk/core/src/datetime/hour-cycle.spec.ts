import { dayPeriodNames, from12, resolveHourCycle, to12 } from './hour-cycle';

describe('to12', () => {
  it.each([
    [0, { h12: 12, pm: false }],
    [1, { h12: 1, pm: false }],
    [11, { h12: 11, pm: false }],
    [12, { h12: 12, pm: true }],
    [13, { h12: 1, pm: true }],
    [23, { h12: 11, pm: true }],
  ])('maps 24h hour %i to %o', (hour, expected) => {
    expect(to12(hour)).toEqual(expected);
  });
});

describe('from12', () => {
  it.each([
    [12, false, 0],
    [1, false, 1],
    [11, false, 11],
    [12, true, 12],
    [1, true, 13],
    [11, true, 23],
  ])('maps display %i (pm=%s) to 24h hour %i', (h12, pm, expected) => {
    expect(from12(h12, pm)).toBe(expected);
  });
});

describe('from12 / to12 round-trip', () => {
  it('recovers every 24h hour through to12 then from12', () => {
    for (let hour = 0; hour < 24; hour++) {
      const { h12, pm } = to12(hour);
      expect(from12(h12, pm)).toBe(hour);
    }
  });
});

describe('resolveHourCycle', () => {
  it('returns an explicit override unchanged', () => {
    expect(resolveHourCycle(undefined, 12)).toBe(12);
    expect(resolveHourCycle(undefined, 24)).toBe(24);
  });

  it('an explicit override wins over the locale preference', () => {
    expect(resolveHourCycle('en-US', 24)).toBe(24);
    expect(resolveHourCycle('en-GB', 12)).toBe(12);
  });

  it('derives 12 for a 12-hour-preferring locale when no override is given', () => {
    expect(resolveHourCycle('en-US', null)).toBe(12);
  });

  it('derives 24 for a 24-hour-preferring locale when no override is given', () => {
    expect(resolveHourCycle('en-GB', null)).toBe(24);
  });
});

describe('dayPeriodNames', () => {
  it('reads the English AM / PM strings', () => {
    const names = dayPeriodNames('en-US');
    expect(names.am.toUpperCase()).toContain('AM');
    expect(names.pm.toUpperCase()).toContain('PM');
  });

  it('returns distinct, non-empty strings for a non-English locale', () => {
    const names = dayPeriodNames('ja-JP');
    expect(names.am).toBeTruthy();
    expect(names.pm).toBeTruthy();
    expect(names.am).not.toBe(names.pm);
  });
});
