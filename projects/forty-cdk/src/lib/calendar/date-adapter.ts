import { inject, InjectionToken } from '@angular/core';

/**
 * Pluggable, date-library-agnostic seam for `ForCalendar`. Every internal
 * algorithm (paging, the day matrix, comparison, formatting) goes through a
 * `DateAdapter<D>`, so the primitive never hard-depends on a date library.
 *
 * The library ships two adapters behind {@link FOR_DATE_ADAPTER}:
 *
 * - `provideInternationalizedDateAdapter()` — over `@internationalized/date`'s
 *   immutable, calendar-aware `CalendarDate`. Recommended for correct
 *   internationalised calendars; `@internationalized/date` is an optional
 *   peer dependency.
 * - `provideNativeDateAdapter()` — over the built-in `Date`. Zero-dependency
 *   fallback.
 *
 * A `Temporal.PlainDate` adapter is a planned non-breaking addition once the
 * Temporal API is broadly available across browsers.
 *
 * Implementations must be pure with respect to their date type: every
 * operation returns a value and never mutates its inputs. The `D` produced by
 * mutating operations (`add*`, `createDate`) is a fresh value, which keeps it
 * signal-friendly (reference equality changes on every change).
 *
 * @typeParam D The immutable date representation the adapter operates on.
 */
export interface DateAdapter<D> {
  /** Today's date in the local time zone. */
  today(): D;

  /**
   * Creates a date from its parts.
   *
   * @param year Full year (e.g. `2026`).
   * @param month Month of year, **1-12**.
   * @param day Day of month, **1-31** (constrained to the month's length).
   */
  createDate(year: number, month: number, day: number): D;

  /** The full year of `date` (e.g. `2026`). */
  getYear(date: D): number;

  /** The month of `date`, **1-12**. */
  getMonth(date: D): number;

  /** The day of month of `date`, **1-31**. */
  getDate(date: D): number;

  /** The day of week of `date`, **0-6** where `0` is Sunday and `6` is Saturday. */
  getDayOfWeek(date: D): number;

  /** The number of days in `date`'s month. */
  getDaysInMonth(date: D): number;

  /**
   * The first day of the week as a **0-6** index (`0` = Sunday). Used as the
   * default when `ForCalendar`'s `firstDayOfWeek` input is `null`. Adapters
   * return a locale-independent default (`0`); consumers localise it through
   * the `firstDayOfWeek` input or `provideForCalendarDefaults`.
   */
  getFirstDayOfWeek(): number;

  /** Returns a new date `n` days after `date` (negative goes backwards). */
  addDays(date: D, n: number): D;

  /**
   * Returns a new date `n` months after `date` (negative goes backwards). The
   * day of month is constrained to the target month's length (e.g. Jan 31 + 1
   * month is Feb 28/29, never Mar 3).
   */
  addMonths(date: D, n: number): D;

  /**
   * Returns a new date `n` years after `date` (negative goes backwards). The
   * day of month is constrained (e.g. Feb 29 + 1 year is Feb 28 in a common
   * year).
   */
  addYears(date: D, n: number): D;

  /**
   * Compares two dates by calendar day. Returns a negative number when `a` is
   * before `b`, `0` when they are the same day, and a positive number when `a`
   * is after `b`.
   */
  compare(a: D, b: D): number;

  /** Whether `a` and `b` fall on the same calendar day. */
  isSameDay(a: D, b: D): boolean;

  /** Whether `date` is a valid date of this adapter's type. */
  isValid(date: D): boolean;

  /**
   * Formats `date` for display using the runtime's default locale.
   *
   * @param options Standard `Intl.DateTimeFormat` options (e.g.
   *   `{ month: 'long', year: 'numeric' }` for a calendar heading,
   *   `{ weekday: 'short' }` for a column header).
   */
  format(date: D, options: Intl.DateTimeFormatOptions): string;
}

/**
 * Injection token holding the active {@link DateAdapter}. Provide it with
 * `provideInternationalizedDateAdapter()` or `provideNativeDateAdapter()`.
 * There is no application-wide default — a calendar with no adapter in scope
 * throws a descriptive error.
 */
export const FOR_DATE_ADAPTER = new InjectionToken<DateAdapter<unknown>>('FOR_DATE_ADAPTER');

/**
 * Injects the active {@link DateAdapter}, throwing a descriptive,
 * primitive-prefixed error when no adapter has been provided.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectDateAdapter<D>(piece: string): DateAdapter<D> {
  const adapter = inject(FOR_DATE_ADAPTER, { optional: true });
  if (!adapter) {
    throw new Error(
      `[forty-cdk/calendar] ${piece} requires a DateAdapter. Provide one with ` +
        `provideInternationalizedDateAdapter() or provideNativeDateAdapter() in your ` +
        `application or component providers.`,
    );
  }
  return adapter as DateAdapter<D>;
}
