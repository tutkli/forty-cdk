import type { DateAdapter, TimeCapableDateAdapter } from '../date-adapter/date-adapter';
import { NativeDateAdapter } from '../../calendar/native-date-adapter';
import {
  clampToBounds,
  composeWithTime,
  secondsOfDay,
  serializeISODate,
  serializeISOTime,
  timeSentinel,
} from './serialize';

const adapter: TimeCapableDateAdapter<Date> =
  new NativeDateAdapter() as TimeCapableDateAdapter<Date>;
const at = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0): Date =>
  new Date(y, mo - 1, d, h, mi, s);

describe('clampToBounds', () => {
  it('returns the date unchanged when within bounds', () => {
    const date = at(2026, 6, 15);
    expect(clampToBounds(adapter, date, at(2026, 6, 1), at(2026, 6, 30))).toBe(date);
  });

  it('returns the date unchanged when both bounds are null', () => {
    const date = at(2026, 6, 15);
    expect(clampToBounds(adapter, date, null, null)).toBe(date);
  });

  it('returns the lower bound when the date is before it', () => {
    const min = at(2026, 6, 10);
    expect(clampToBounds(adapter, at(2026, 6, 1), min, null)).toBe(min);
  });

  it('returns the upper bound when the date is after it', () => {
    const max = at(2026, 6, 20);
    expect(clampToBounds(adapter, at(2026, 6, 30), null, max)).toBe(max);
  });

  it('uses the supplied comparator over adapter.compare', () => {
    const date = at(2026, 6, 15, 23);
    const min = at(2026, 6, 15, 8);
    expect(clampToBounds(adapter, date, min, null, (a, b) => adapter.compare(a, b))).toBe(date);
    const dayOnly = (a: Date, b: Date): number => {
      if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() - b.getFullYear();
      if (a.getMonth() !== b.getMonth()) return a.getMonth() - b.getMonth();
      return a.getDate() - b.getDate();
    };
    expect(clampToBounds(adapter, date, min, null, dayOnly)).toBe(date);
  });
});

describe('serializeISODate', () => {
  it('serializes a day-granularity value as YYYY-MM-DD', () => {
    expect(serializeISODate(adapter, at(2026, 6, 5), 'day', 'Test')).toBe('2026-06-05');
  });

  it('zero-pads the year to four digits', () => {
    const early = new Date(2000, 0, 2);
    early.setFullYear(7);
    expect(serializeISODate(adapter, early, 'day', 'Test')).toBe('0007-01-02');
  });

  it('serializes hour / minute granularity as YYYY-MM-DDTHH:mm', () => {
    expect(serializeISODate(adapter, at(2026, 6, 5, 9, 7), 'minute', 'Test')).toBe(
      '2026-06-05T09:07',
    );
  });

  it('serializes second granularity as YYYY-MM-DDTHH:mm:ss', () => {
    expect(serializeISODate(adapter, at(2026, 6, 5, 9, 7, 3), 'second', 'Test')).toBe(
      '2026-06-05T09:07:03',
    );
  });

  it('throws a piece-prefixed error when serializing a timed value on a day-only adapter', () => {
    const dayOnly = {
      getYear: () => 2026,
      getMonth: () => 6,
      getDate: () => 5,
    } as unknown as DateAdapter<Date>;
    expect(() => serializeISODate(dayOnly, at(2026, 6, 5), 'minute', 'ForDateField')).toThrowError(
      /ForDateField/,
    );
  });
});

describe('serializeISOTime', () => {
  it('serializes hour granularity as HH', () => {
    expect(serializeISOTime(adapter, at(2026, 6, 5, 9), 'hour')).toBe('09');
  });

  it('serializes minute granularity as HH:mm', () => {
    expect(serializeISOTime(adapter, at(2026, 6, 5, 9, 7), 'minute')).toBe('09:07');
  });

  it('serializes second granularity as HH:mm:ss', () => {
    expect(serializeISOTime(adapter, at(2026, 6, 5, 9, 7, 3), 'second')).toBe('09:07:03');
  });
});

describe('composeWithTime', () => {
  it('keeps the day of the first argument and the time of the second', () => {
    const composed = composeWithTime(adapter, at(2026, 6, 5, 1, 2, 3), at(2026, 1, 1, 14, 30, 45));
    expect(adapter.getYear(composed)).toBe(2026);
    expect(adapter.getMonth(composed)).toBe(6);
    expect(adapter.getDate(composed)).toBe(5);
    expect(adapter.getHours(composed)).toBe(14);
    expect(adapter.getMinutes(composed)).toBe(30);
    expect(adapter.getSeconds(composed)).toBe(45);
  });
});

describe('timeSentinel', () => {
  it('returns 2000-01-01', () => {
    const sentinel = timeSentinel(adapter);
    expect(adapter.getYear(sentinel)).toBe(2000);
    expect(adapter.getMonth(sentinel)).toBe(1);
    expect(adapter.getDate(sentinel)).toBe(1);
  });
});

describe('secondsOfDay', () => {
  it('reduces the wall-clock time to seconds-of-day, ignoring the calendar day', () => {
    expect(secondsOfDay(adapter, at(2026, 6, 5, 1, 2, 3))).toBe(3723);
    expect(secondsOfDay(adapter, at(1999, 12, 31, 1, 2, 3))).toBe(3723);
  });

  it('returns 0 at midnight', () => {
    expect(secondsOfDay(adapter, at(2026, 6, 5))).toBe(0);
  });
});

describe('serialize round-trip', () => {
  it('serializeISODate at second granularity round-trips back through the adapter', () => {
    const original = at(2026, 6, 5, 9, 7, 3);
    const iso = serializeISODate(adapter, original, 'second', 'Test');
    const parsed = new Date(iso);
    expect(serializeISODate(adapter, parsed, 'second', 'Test')).toBe(iso);
  });

  it('serializeISOTime at second granularity round-trips back through composeWithTime', () => {
    const original = at(2026, 6, 5, 9, 7, 3);
    const iso = serializeISOTime(adapter, original, 'second');
    const recomposed = composeWithTime(adapter, timeSentinel(adapter), original);
    expect(serializeISOTime(adapter, recomposed, 'second')).toBe(iso);
  });
});
