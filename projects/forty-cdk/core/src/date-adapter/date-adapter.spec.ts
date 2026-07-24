import { assertTimeCapable, compareDateOf, type DateAdapter } from './date-adapter';
import { createFormatterCache } from './formatter-cache';

interface Plain {
  y: number;
  m: number;
  d: number;
  h?: number;
  min?: number;
  s?: number;
}

function baseAdapter(): DateAdapter<Plain> {
  return {
    today: () => ({ y: 2026, m: 6, d: 13 }),
    createDate: (year, month, day) => ({ y: year, m: month, d: day }),
    getYear: (date) => date.y,
    getMonth: (date) => date.m,
    getDate: (date) => date.d,
    getDayOfWeek: () => 0,
    getDaysInMonth: () => 30,
    getFirstDayOfWeek: () => 0,
    addDays: (date, n) => ({ ...date, d: date.d + n }),
    addMonths: (date, n) => ({ ...date, m: date.m + n }),
    addYears: (date, n) => ({ ...date, y: date.y + n }),
    compare: (a, b) => a.y - b.y || a.m - b.m || a.d - b.d,
    isSameDay: (a, b) => a.y === b.y && a.m === b.m && a.d === b.d,
    isValid: () => true,
    format: () => '',
  };
}

describe('compareDateOf', () => {
  describe('fallback y/m/d comparison (no compareDate)', () => {
    const adapter = baseAdapter();

    it('returns 0 for the same calendar day', () => {
      expect(compareDateOf(adapter, { y: 2026, m: 6, d: 13 }, { y: 2026, m: 6, d: 13 })).toBe(0);
    });

    it('returns a negative number when a is an earlier day', () => {
      expect(
        compareDateOf(adapter, { y: 2026, m: 6, d: 12 }, { y: 2026, m: 6, d: 13 }),
      ).toBeLessThan(0);
    });

    it('returns a positive number when a is a later day', () => {
      expect(
        compareDateOf(adapter, { y: 2026, m: 7, d: 1 }, { y: 2026, m: 6, d: 30 }),
      ).toBeGreaterThan(0);
    });

    it('orders by year then month then day', () => {
      expect(
        compareDateOf(adapter, { y: 2025, m: 12, d: 31 }, { y: 2026, m: 1, d: 1 }),
      ).toBeLessThan(0);
      expect(
        compareDateOf(adapter, { y: 2026, m: 3, d: 1 }, { y: 2026, m: 2, d: 28 }),
      ).toBeGreaterThan(0);
    });

    it('compares same-day-different-time as equal (ignores the time component)', () => {
      const morning: Plain = { y: 2026, m: 6, d: 13, h: 9 };
      const evening: Plain = { y: 2026, m: 6, d: 13, h: 21 };
      expect(compareDateOf(adapter, morning, evening)).toBe(0);
    });
  });

  describe('delegation to compareDate', () => {
    it('uses the adapter-supplied compareDate when present', () => {
      const calls: Array<[Plain, Plain]> = [];
      const adapter: DateAdapter<Plain> = {
        ...baseAdapter(),
        getYear: () => {
          throw new Error('should not read getters when compareDate is present');
        },
        compareDate: (a, b) => {
          calls.push([a, b]);
          return 0;
        },
      };
      const a: Plain = { y: 2026, m: 6, d: 13 };
      const b: Plain = { y: 2026, m: 6, d: 14 };
      expect(compareDateOf(adapter, a, b)).toBe(0);
      expect(calls).toEqual([[a, b]]);
    });
  });
});

describe('assertTimeCapable', () => {
  it('throws a [forty-cdk/...] error for a day-only adapter', () => {
    const dayOnly = baseAdapter();
    expect(() => assertTimeCapable(dayOnly, 'ForTimeField')).toThrowError(/^\[forty-cdk\//);
  });

  it('names the calling piece in the thrown message', () => {
    expect(() => assertTimeCapable(baseAdapter(), 'ForTimeField')).toThrowError(/ForTimeField/);
  });

  it('throws when only some of the time accessors are present', () => {
    const partial: DateAdapter<Plain> = {
      ...baseAdapter(),
      getHours: (date) => date.h ?? 0,
      getMinutes: (date) => date.min ?? 0,
    };
    expect(() => assertTimeCapable(partial, 'ForTimeField')).toThrow();
  });

  it('returns the narrowed adapter for a time-capable one', () => {
    const timeCapable: DateAdapter<Plain> = {
      ...baseAdapter(),
      supportsTime: () => true,
      getHours: (date) => date.h ?? 0,
      getMinutes: (date) => date.min ?? 0,
      getSeconds: (date) => date.s ?? 0,
      setTime: (date, hours, minutes, seconds) => ({ ...date, h: hours, min: minutes, s: seconds }),
    };
    const narrowed = assertTimeCapable(timeCapable, 'ForTimeField');
    expect(narrowed).toBe(timeCapable);
    expect(narrowed.getHours({ y: 2026, m: 6, d: 13, h: 14 })).toBe(14);
    expect(narrowed.setTime({ y: 2026, m: 6, d: 13 }, 8, 30, 15)).toEqual({
      y: 2026,
      m: 6,
      d: 13,
      h: 8,
      min: 30,
      s: 15,
    });
  });
});

describe('createFormatterCache', () => {
  it('returns the same Intl.DateTimeFormat instance for identical locale and options', () => {
    const cache = createFormatterCache();
    expect(cache('en-US', { month: 'long' })).toBe(cache('en-US', { month: 'long' }));
  });

  it('returns a different instance for a different locale', () => {
    const cache = createFormatterCache();
    const options: Intl.DateTimeFormatOptions = { month: 'long' };
    expect(cache('en-US', options)).not.toBe(cache('fr-FR', options));
  });

  it('returns a different instance for different options', () => {
    const cache = createFormatterCache();
    expect(cache('en-US', { month: 'long' })).not.toBe(cache('en-US', { month: '2-digit' }));
  });

  it('treats an omitted locale as its own stable key', () => {
    const cache = createFormatterCache();
    const options: Intl.DateTimeFormatOptions = { month: 'long' };
    expect(cache(undefined, options)).toBe(cache(undefined, options));
  });
});
