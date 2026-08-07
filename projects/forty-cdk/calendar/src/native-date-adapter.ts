import { Injectable, type Provider } from '@angular/core';

import { createFormatterCache, type DateAdapter, FOR_DATE_ADAPTER } from 'forty-cdk/core';

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1]!;
}

function makeDate(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
): Date {
  const date = new Date(0);
  date.setFullYear(year, monthIndex, day);
  date.setHours(hours, minutes, seconds, milliseconds);
  return date;
}

function clampDay(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
): Date {
  return makeDate(
    year,
    month - 1,
    Math.min(day, daysInMonth(year, month)),
    hours,
    minutes,
    seconds,
    milliseconds,
  );
}

/**
 * Zero-dependency {@link DateAdapter} over the built-in `Date`. `today` and
 * `createDate` produce days at local midnight, and the calendar grid stays
 * day-granular. It is also **time-capable** — `Date` natively carries a
 * wall-clock time, so the optional `getHours` / `getMinutes` / `getSeconds` /
 * `setTime` accessors are implemented, letting `ForTimeField` use this adapter
 * directly. Consistently with that, `compare` orders by the full instant
 * (day *and* time), matching `InternationalizedDateTimeAdapter`, so a date-time
 * `minDate`/`maxDate` clamps identically on both.
 *
 * This is the fallback adapter. Prefer `provideInternationalizedDateAdapter()`
 * for correct date-math and locale-aware formatting (or
 * `provideInternationalizedDateTimeAdapter()` for a time-capable one); reach
 * for this one when adding a date library to the bundle is not worthwhile. Both
 * `Date` and the `@internationalized/date` adapters operate on the Gregorian
 * calendar; non-Gregorian calendar systems are not supported.
 */
@Injectable()
export class NativeDateAdapter implements DateAdapter<Date> {
  readonly #formatter = createFormatterCache();

  /**
   * Today at local midnight in the runtime time zone. Subject to the
   * SSR/hydration caveat on {@link DateAdapter.today}.
   */
  today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  createDate(year: number, month: number, day: number): Date {
    return clampDay(year, month, day);
  }

  getYear(date: Date): number {
    return date.getFullYear();
  }

  getMonth(date: Date): number {
    return date.getMonth() + 1;
  }

  getDate(date: Date): number {
    return date.getDate();
  }

  getDayOfWeek(date: Date): number {
    return date.getDay();
  }

  getDaysInMonth(date: Date): number {
    return daysInMonth(date.getFullYear(), date.getMonth() + 1);
  }

  getFirstDayOfWeek(): number {
    return 0;
  }

  addDays(date: Date, n: number): Date {
    return makeDate(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + n,
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    );
  }

  addMonths(date: Date, n: number): Date {
    const total = date.getMonth() + n;
    const year = date.getFullYear() + Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12;
    return clampDay(
      year,
      month + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    );
  }

  addYears(date: Date, n: number): Date {
    return clampDay(
      date.getFullYear() + n,
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    );
  }

  compare(a: Date, b: Date): number {
    return a.getTime() - b.getTime();
  }

  isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  isValid(date: Date): boolean {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }

  /**
   * Formats through `locale`, or the runtime's default locale when omitted.
   * Subject to the SSR/hydration caveat on {@link DateAdapter.format}.
   */
  format(date: Date, options: Intl.DateTimeFormatOptions, locale?: string): string {
    return this.#formatter(locale, options).format(date);
  }

  supportsTime(): boolean {
    return true;
  }

  getHours(date: Date): number {
    return date.getHours();
  }

  getMinutes(date: Date): number {
    return date.getMinutes();
  }

  getSeconds(date: Date): number {
    return date.getSeconds();
  }

  setTime(date: Date, hours: number, minutes: number, seconds: number): Date {
    return makeDate(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds);
  }
}

/**
 * Provides the zero-dependency {@link NativeDateAdapter} as the active
 * {@link DateAdapter}. Add to your application or component providers when
 * `ForCalendar` should operate on native `Date` values.
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideNativeDateAdapter()],
 * });
 * ```
 */
export function provideNativeDateAdapter(): Provider[] {
  return [{ provide: FOR_DATE_ADAPTER, useClass: NativeDateAdapter }];
}
