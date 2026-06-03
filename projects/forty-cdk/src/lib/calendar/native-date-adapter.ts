import { Injectable, type Provider } from '@angular/core';

import { type DateAdapter, FOR_DATE_ADAPTER } from './date-adapter';

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, Math.min(day, daysInMonth(year, month)));
}

/**
 * Zero-dependency {@link DateAdapter} over the built-in `Date`. The calendar
 * operations treat dates as days at local midnight; the time-zone component is
 * ignored. It is also **time-capable** — `Date` natively carries a wall-clock
 * time, so the optional `getHours` / `getMinutes` / `getSeconds` / `setTime`
 * accessors are implemented, letting `ForTimeField` use this adapter directly.
 *
 * This is the fallback adapter. Prefer `provideInternationalizedDateAdapter()`
 * for correct internationalised calendars (or
 * `provideInternationalizedDateTimeAdapter()` for a time-capable one); reach
 * for this one when adding a date library to the bundle is not worthwhile.
 */
@Injectable()
export class NativeDateAdapter implements DateAdapter<Date> {
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
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
  }

  addMonths(date: Date, n: number): Date {
    const total = date.getMonth() + n;
    const year = date.getFullYear() + Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12;
    return clampDay(year, month + 1, date.getDate());
  }

  addYears(date: Date, n: number): Date {
    return clampDay(date.getFullYear() + n, date.getMonth() + 1, date.getDate());
  }

  compare(a: Date, b: Date): number {
    const ay = a.getFullYear();
    const by = b.getFullYear();
    if (ay !== by) {
      return ay - by;
    }
    const am = a.getMonth();
    const bm = b.getMonth();
    if (am !== bm) {
      return am - bm;
    }
    return a.getDate() - b.getDate();
  }

  compareDate(a: Date, b: Date): number {
    return this.compare(a, b);
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

  format(date: Date, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(undefined, options).format(date);
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
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds);
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
