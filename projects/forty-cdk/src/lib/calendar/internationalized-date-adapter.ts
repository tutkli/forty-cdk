import { Injectable, type Provider } from '@angular/core';
import { CalendarDate, getLocalTimeZone, isSameDay, today } from '@internationalized/date';

import { type DateAdapter, FOR_DATE_ADAPTER } from '../_internal/date-adapter/date-adapter';

/**
 * {@link DateAdapter} over `@internationalized/date`'s immutable `CalendarDate`.
 * This is the recommended adapter: it is the same date primitive React Aria and
 * Ark UI build on, it works in every browser today with no polyfill, and its
 * reference-equality-on-mutation makes it signal-friendly.
 *
 * **Gregorian only.** `createDate` always builds a Gregorian `CalendarDate`, so
 * the calendar grid is Gregorian regardless of the runtime locale. True
 * non-Gregorian calendar systems are deferred to the planned Temporal adapter
 * track (#354).
 *
 * `@internationalized/date` is an **optional peer dependency** — install it
 * only when you use this adapter. A consumer that relies solely on
 * `provideNativeDateAdapter()` never imports this file, so the package is
 * tree-shaken out of their bundle.
 */
@Injectable()
export class InternationalizedDateAdapter implements DateAdapter<CalendarDate> {
  /**
   * Today as a `CalendarDate` in the runtime time zone (`getLocalTimeZone()`).
   * Subject to the SSR/hydration caveat on {@link DateAdapter.today}.
   */
  today(): CalendarDate {
    return today(getLocalTimeZone());
  }

  createDate(year: number, month: number, day: number): CalendarDate {
    return new CalendarDate(year, month, day);
  }

  getYear(date: CalendarDate): number {
    return date.year;
  }

  getMonth(date: CalendarDate): number {
    return date.month;
  }

  getDate(date: CalendarDate): number {
    return date.day;
  }

  getDayOfWeek(date: CalendarDate): number {
    return date.toDate(getLocalTimeZone()).getDay();
  }

  getDaysInMonth(date: CalendarDate): number {
    return date.calendar.getDaysInMonth(date);
  }

  getFirstDayOfWeek(): number {
    return 0;
  }

  addDays(date: CalendarDate, n: number): CalendarDate {
    return date.add({ days: n });
  }

  addMonths(date: CalendarDate, n: number): CalendarDate {
    return date.add({ months: n });
  }

  addYears(date: CalendarDate, n: number): CalendarDate {
    return date.add({ years: n });
  }

  compare(a: CalendarDate, b: CalendarDate): number {
    return a.compare(b);
  }

  isSameDay(a: CalendarDate, b: CalendarDate): boolean {
    return isSameDay(a, b);
  }

  isValid(date: CalendarDate): boolean {
    return date instanceof CalendarDate;
  }

  /**
   * Formats through the runtime's default locale and time zone. Subject to the
   * SSR/hydration caveat on {@link DateAdapter.format}.
   */
  format(date: CalendarDate, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(undefined, options).format(date.toDate(getLocalTimeZone()));
  }
}

/**
 * Provides the {@link InternationalizedDateAdapter} as the active
 * {@link DateAdapter}, making `ForCalendar` operate on `CalendarDate` values
 * from `@internationalized/date`.
 *
 * Requires `@internationalized/date` to be installed (optional peer
 * dependency).
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideInternationalizedDateAdapter()],
 * });
 * ```
 */
export function provideInternationalizedDateAdapter(): Provider[] {
  return [{ provide: FOR_DATE_ADAPTER, useClass: InternationalizedDateAdapter }];
}
