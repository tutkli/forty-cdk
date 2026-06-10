import { Injectable, type Provider } from '@angular/core';
import {
  CalendarDateTime,
  getLocalTimeZone,
  isSameDay,
  toCalendarDateTime,
  today,
} from '@internationalized/date';

import { type DateAdapter, FOR_DATE_ADAPTER } from 'forty-cdk';

/**
 * Time-capable {@link DateAdapter} over `@internationalized/date`'s immutable
 * `CalendarDateTime`. It mirrors {@link InternationalizedDateAdapter} for all
 * day operations but adds a wall-clock time component (hour / minute / second),
 * so it backs `ForTimeField` and the time granularity of the date primitives.
 * Use it when you want the `@internationalized/date` types *and* a time.
 *
 * **Gregorian only.** Like {@link InternationalizedDateAdapter}, `createDate`
 * builds a Gregorian `CalendarDateTime`; non-Gregorian calendar systems are
 * deferred to the planned Temporal adapter track (#354).
 *
 * Ships in the `forty-cdk/internationalized-date` secondary entry point so the
 * main `forty-cdk` bundle never references `@internationalized/date` — the
 * package is an **optional peer dependency**, required only by consumers who
 * import this entry point. A consumer relying solely on
 * `provideNativeDateAdapter()` never resolves it at all.
 *
 * `compare` orders by the full date-time (day *and* time); `compareDate`
 * ignores the time and orders by calendar day, so the calendar grid stays
 * day-granular even when `min`/`max` carry a time.
 */
@Injectable()
export class InternationalizedDateTimeAdapter implements DateAdapter<CalendarDateTime> {
  /**
   * Today as a `CalendarDateTime` in the runtime time zone
   * (`getLocalTimeZone()`). Subject to the SSR/hydration caveat on
   * {@link DateAdapter.today}.
   */
  today(): CalendarDateTime {
    return toCalendarDateTime(today(getLocalTimeZone()));
  }

  createDate(year: number, month: number, day: number): CalendarDateTime {
    return new CalendarDateTime(year, month, day);
  }

  getYear(date: CalendarDateTime): number {
    return date.year;
  }

  getMonth(date: CalendarDateTime): number {
    return date.month;
  }

  getDate(date: CalendarDateTime): number {
    return date.day;
  }

  getDayOfWeek(date: CalendarDateTime): number {
    return date.toDate(getLocalTimeZone()).getDay();
  }

  getDaysInMonth(date: CalendarDateTime): number {
    return date.calendar.getDaysInMonth(date);
  }

  getFirstDayOfWeek(): number {
    return 0;
  }

  addDays(date: CalendarDateTime, n: number): CalendarDateTime {
    return date.add({ days: n });
  }

  addMonths(date: CalendarDateTime, n: number): CalendarDateTime {
    return date.add({ months: n });
  }

  addYears(date: CalendarDateTime, n: number): CalendarDateTime {
    return date.add({ years: n });
  }

  compare(a: CalendarDateTime, b: CalendarDateTime): number {
    return a.compare(b);
  }

  compareDate(a: CalendarDateTime, b: CalendarDateTime): number {
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    if (a.month !== b.month) {
      return a.month - b.month;
    }
    return a.day - b.day;
  }

  isSameDay(a: CalendarDateTime, b: CalendarDateTime): boolean {
    return isSameDay(a, b);
  }

  isValid(date: CalendarDateTime): boolean {
    return date instanceof CalendarDateTime;
  }

  /**
   * Formats through the runtime's default locale and time zone. Subject to the
   * SSR/hydration caveat on {@link DateAdapter.format}.
   */
  format(date: CalendarDateTime, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(undefined, options).format(date.toDate(getLocalTimeZone()));
  }

  supportsTime(): boolean {
    return true;
  }

  getHours(date: CalendarDateTime): number {
    return date.hour;
  }

  getMinutes(date: CalendarDateTime): number {
    return date.minute;
  }

  getSeconds(date: CalendarDateTime): number {
    return date.second;
  }

  setTime(
    date: CalendarDateTime,
    hours: number,
    minutes: number,
    seconds: number,
  ): CalendarDateTime {
    return date.set({ hour: hours, minute: minutes, second: seconds, millisecond: 0 });
  }
}

/**
 * Provides the {@link InternationalizedDateTimeAdapter} as the active
 * {@link DateAdapter}, making the time / date-time primitives operate on
 * `CalendarDateTime` values from `@internationalized/date`.
 *
 * Requires `@internationalized/date` to be installed (optional peer
 * dependency).
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideInternationalizedDateTimeAdapter()],
 * });
 * ```
 */
export function provideInternationalizedDateTimeAdapter(): Provider[] {
  return [{ provide: FOR_DATE_ADAPTER, useClass: InternationalizedDateTimeAdapter }];
}
