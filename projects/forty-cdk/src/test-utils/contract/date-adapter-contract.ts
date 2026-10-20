import { resetLocalTimeZone } from '@internationalized/date';

import { compareDateOf } from 'forty-cdk/core';
import type { DateAdapter, TimeCapableDateAdapter } from 'forty-cdk/date-adapter';

export type DateAdapterClass<D> = new () => DateAdapter<D>;

export interface DateAdapterContractOptions<D> {
  /**
   * For a time-capable adapter: a value on 2026-06-15 at 09:10:11.250, the
   * milliseconds being what `setTime` must drop.
   */
  dateTimeWithMilliseconds?: () => D;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function timeCapable<D>(adapter: DateAdapter<D>): TimeCapableDateAdapter<D> {
  if (
    adapter.supportsTime?.() !== true ||
    !adapter.getHours ||
    !adapter.getMinutes ||
    !adapter.getSeconds ||
    !adapter.setTime
  ) {
    throw new Error('The adapter under test does not implement the time accessors.');
  }
  return adapter as TimeCapableDateAdapter<D>;
}

function inTimeZone(zone: string): void {
  let runtimeZone = '';

  beforeEach(() => {
    runtimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    vi.stubEnv('TZ', zone);
    resetLocalTimeZone();
  });

  afterEach(() => {
    vi.stubEnv('TZ', runtimeZone);
    vi.unstubAllEnvs();
    resetLocalTimeZone();
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(runtimeZone);
  });
}

export function assertDateAdapterContract<D>(
  adapterClass: DateAdapterClass<D>,
  options: DateAdapterContractOptions<D> = {},
): void {
  const supportsTime = new adapterClass().supportsTime?.() === true;

  class FrenchAdapter extends adapterClass {
    override locale(): string | null {
      return 'fr-FR';
    }
  }

  describe(`date adapter contract (${adapterClass.name.replace(/^_/, '')})`, () => {
    let adapter: DateAdapter<D>;

    beforeEach(() => {
      adapter = new adapterClass();
    });

    it('maps years 1-99 to the literal year, never the 1901-1999 legacy offset', () => {
      expect(adapter.getYear(adapter.createDate(50, 6, 15))).toBe(50);
      expect(adapter.getYear(adapter.createDate(7, 1, 1))).toBe(7);
      expect(adapter.getYear(adapter.addYears(adapter.createDate(99, 6, 15), 2))).toBe(101);
      expect(adapter.getYear(adapter.addYears(adapter.createDate(101, 6, 15), -2))).toBe(99);

      const addedMonths = adapter.addMonths(adapter.createDate(50, 12, 1), 1);
      expect(adapter.getYear(addedMonths)).toBe(51);
      expect(adapter.getMonth(addedMonths)).toBe(1);
    });

    it('exposes a twelve-month Gregorian year (month 1-12, December is the last month)', () => {
      for (let month = 1; month <= 12; month++) {
        expect(adapter.getMonth(adapter.createDate(2026, month, 1))).toBe(month);
      }
      const afterDecember = adapter.addMonths(adapter.createDate(2026, 12, 1), 1);
      expect(adapter.getYear(afterDecember)).toBe(2027);
      expect(adapter.getMonth(afterDecember)).toBe(1);
    });

    it('getDayOfWeek returns the absolute Sunday=0 index', () => {
      expect(adapter.getDayOfWeek(adapter.createDate(2026, 6, 14))).toBe(0);
      expect(adapter.getDayOfWeek(adapter.createDate(2026, 6, 17))).toBe(3);
      expect(adapter.getDayOfWeek(adapter.createDate(2026, 6, 20))).toBe(6);
      expect(adapter.getDayOfWeek(adapter.createDate(50, 6, 15))).toBe(3);
    });

    it('getDaysInMonth follows the Gregorian leap-year rule, century years included', () => {
      const days = (year: number, month: number) =>
        adapter.getDaysInMonth(adapter.createDate(year, month, 1));

      expect(days(2026, 1)).toBe(31);
      expect(days(2026, 2)).toBe(28);
      expect(days(2024, 2)).toBe(29);
      expect(days(1900, 2)).toBe(28);
      expect(days(2000, 2)).toBe(29);
      expect(days(2026, 4)).toBe(30);
      expect(days(2026, 12)).toBe(31);
    });

    it('add* moves across month and year boundaries and constrains the day of month', () => {
      const ymd = (date: D) =>
        `${adapter.getYear(date)}-${adapter.getMonth(date)}-${adapter.getDate(date)}`;

      expect(ymd(adapter.addDays(adapter.createDate(2026, 12, 31), 1))).toBe('2027-1-1');
      expect(ymd(adapter.addDays(adapter.createDate(2026, 3, 1), -1))).toBe('2026-2-28');
      expect(ymd(adapter.addMonths(adapter.createDate(2026, 1, 31), 1))).toBe('2026-2-28');
      expect(ymd(adapter.addMonths(adapter.createDate(2026, 3, 31), -1))).toBe('2026-2-28');
      expect(ymd(adapter.addYears(adapter.createDate(2024, 2, 29), 1))).toBe('2025-2-28');
    });

    it('compare orders by day and isSameDay matches the same calendar day only', () => {
      const early = adapter.createDate(2026, 6, 19);
      const late = adapter.createDate(2026, 6, 20);

      expect(adapter.compare(early, late)).toBeLessThan(0);
      expect(adapter.compare(late, early)).toBeGreaterThan(0);
      expect(adapter.compare(late, adapter.createDate(2026, 6, 20))).toBe(0);
      expect(adapter.isSameDay(late, adapter.createDate(2026, 6, 20))).toBe(true);
      expect(adapter.isSameDay(early, late)).toBe(false);
    });

    it('isValid accepts the values the adapter itself produces', () => {
      const date = adapter.createDate(2026, 6, 15);

      expect(adapter.isValid(date)).toBe(true);
      expect(adapter.isValid(adapter.addMonths(date, 1))).toBe(true);
      expect(adapter.isValid(adapter.today())).toBe(true);
    });

    describe('today()', () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 5, 15, 23, 59, 30));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('is the current calendar day of the runtime time zone', () => {
        const today = adapter.today();

        expect(adapter.getYear(today)).toBe(2026);
        expect(adapter.getMonth(today)).toBe(6);
        expect(adapter.getDate(today)).toBe(15);
        if (supportsTime) {
          const time = timeCapable(adapter);
          expect([time.getHours(today), time.getMinutes(today), time.getSeconds(today)]).toEqual([
            0, 0, 0,
          ]);
        }
      });
    });

    it('format uses an explicit locale first, then locale(), then the runtime default', () => {
      const longMonth: Intl.DateTimeFormatOptions = { month: 'long' };
      const french = new FrenchAdapter();

      expect(adapter.format(adapter.createDate(2026, 3, 1), longMonth, 'fr-FR')).toBe('mars');
      expect(adapter.format(adapter.createDate(2026, 3, 1), longMonth, 'en-US')).toBe('March');
      expect(french.format(french.createDate(2026, 3, 1), longMonth)).toBe('mars');
      expect(french.format(french.createDate(2026, 3, 1), longMonth, 'en-US')).toBe('March');
      expect(adapter.format(adapter.createDate(2026, 3, 15), longMonth)).toBe(
        new Intl.DateTimeFormat(undefined, longMonth).format(new Date(2026, 2, 15)),
      );
    });

    it('memoizes Intl.DateTimeFormat by locale and options', () => {
      const date = adapter.createDate(2026, 3, 1);
      const constructed = vi.spyOn(Intl, 'DateTimeFormat');

      adapter.format(date, { month: 'long' }, 'en-US');
      adapter.format(date, { month: 'long' }, 'en-US');
      expect(constructed).toHaveBeenCalledTimes(1);

      expect(adapter.format(date, { month: 'long' }, 'fr-FR')).toBe('mars');
      expect(adapter.format(date, { month: '2-digit' }, 'en-US')).toBe('03');
      expect(constructed).toHaveBeenCalledTimes(3);
    });

    describe('under a time zone that skips a whole local day', () => {
      inTimeZone('Pacific/Apia');

      it('formats and weekdays the day as its getters report it', () => {
        const date = adapter.createDate(2011, 12, 30);
        const [year, month, day] = [
          adapter.getYear(date),
          adapter.getMonth(date),
          adapter.getDate(date),
        ];

        expect(adapter.format(date, { day: 'numeric' }, 'en-US')).toBe(String(day));
        expect(adapter.getDayOfWeek(date)).toBe(
          new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
        );
      });
    });

    if (supportsTime) {
      it('declares a date-time carrying milliseconds', () => {
        expect(options.dateTimeWithMilliseconds).toBeDefined();
      });

      it('setTime keeps the calendar day and drops milliseconds', () => {
        const time = timeCapable(adapter);
        const seed = options.dateTimeWithMilliseconds!();
        const set = time.setTime(seed, 14, 30, 45);

        expect([time.getYear(set), time.getMonth(set), time.getDate(set)]).toEqual([2026, 6, 15]);
        expect([time.getHours(set), time.getMinutes(set), time.getSeconds(set)]).toEqual([
          14, 30, 45,
        ]);
        expect(time.compare(set, time.setTime(time.createDate(2026, 6, 15), 14, 30, 45))).toBe(0);
      });

      it('add* preserves the wall-clock time', () => {
        const time = timeCapable(adapter);
        const seed = time.setTime(time.createDate(2026, 6, 15), 14, 30, 45);

        for (const advanced of [
          time.addDays(seed, 3),
          time.addMonths(seed, 2),
          time.addYears(seed, 1),
        ]) {
          expect([
            time.getHours(advanced),
            time.getMinutes(advanced),
            time.getSeconds(advanced),
          ]).toEqual([14, 30, 45]);
        }
      });

      it('compare orders by the full date-time while the day comparisons ignore the time', () => {
        const time = timeCapable(adapter);
        const morning = time.setTime(time.createDate(2026, 6, 20), 9, 0, 0);
        const evening = time.setTime(time.createDate(2026, 6, 20), 17, 0, 0);

        expect(time.compare(morning, evening)).toBeLessThan(0);
        expect(compareDateOf(time, morning, evening)).toBe(0);
        expect(time.isSameDay(morning, evening)).toBe(true);
      });

      describe('under a time zone that skips a wall-clock hour', () => {
        inTimeZone('Europe/Madrid');

        it('formats the time as its getters report it', () => {
          const time = timeCapable(adapter);
          const date = time.setTime(time.createDate(2026, 3, 29), 2, 30, 0);

          expect(
            time.format(date, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, 'en-GB'),
          ).toBe(`${pad(time.getHours(date))}:${pad(time.getMinutes(date))}`);
          expect(time.getDayOfWeek(date)).toBe(0);
        });
      });
    }
  });
}
