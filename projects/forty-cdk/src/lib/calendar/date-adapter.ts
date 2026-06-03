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
   * Compares two dates by their natural ordering. Returns a negative number
   * when `a` is before `b`, `0` when they are equal, and a positive number when
   * `a` is after `b`. Adapters whose `D` carries a time component
   * (`@internationalized/date`'s `CalendarDateTime`) order by the full
   * date-time. For day-granular availability and bounds use {@link compareDate},
   * which ignores the time on every adapter.
   */
  compare(a: D, b: D): number;

  /**
   * Compares two dates by calendar day only, ignoring any time component.
   * Returns a negative number when `a`'s day is before `b`'s, `0` when they
   * fall on the same calendar day, and a positive number when `a`'s day is
   * after `b`'s. Used for calendar-grid availability and bounds so the boundary
   * day of a date-time `min`/`max` stays selectable regardless of adapter.
   */
  compareDate(a: D, b: D): number;

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

  /**
   * Whether this adapter's `D` can carry a wall-clock time component (hour /
   * minute / second). Day-only adapters omit the optional time accessors below
   * and return `false` (or omit this method); time-capable adapters implement
   * them and return `true`. `ForTimeField` — and the time granularity of the
   * date primitives — require a time-capable adapter.
   */
  supportsTime?(): boolean;

  /** The hour of `date`, **0-23** (24-hour clock). Time-capable adapters only. */
  getHours?(date: D): number;

  /** The minute of `date`, **0-59**. Time-capable adapters only. */
  getMinutes?(date: D): number;

  /** The second of `date`, **0-59**. Time-capable adapters only. */
  getSeconds?(date: D): number;

  /**
   * Returns a new date with its time set to the given parts, preserving the
   * calendar day. Time-capable adapters only.
   *
   * @param hours Hour of day, **0-23**.
   * @param minutes Minute of hour, **0-59**.
   * @param seconds Second of minute, **0-59**.
   */
  setTime?(date: D, hours: number, minutes: number, seconds: number): D;
}

/**
 * A {@link DateAdapter} narrowed to one that implements the optional time
 * accessors. Produced by {@link assertTimeCapable} so time primitives can call
 * `getHours` / `setTime` / etc. without optional-chaining.
 *
 * @typeParam D The adapter's immutable date-time representation.
 */
export type TimeCapableDateAdapter<D> = DateAdapter<D> &
  Required<Pick<DateAdapter<D>, 'getHours' | 'getMinutes' | 'getSeconds' | 'setTime'>>;

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

/**
 * Asserts that `adapter` implements the optional time accessors, returning it
 * narrowed to {@link TimeCapableDateAdapter}. Throws a descriptive,
 * primitive-prefixed error when the active adapter is day-only — the
 * zero-dependency `provideNativeDateAdapter()` is time-capable, as is
 * `provideInternationalizedDateTimeAdapter()`, but the day-pure
 * `provideInternationalizedDateAdapter()` (`CalendarDate`) is not.
 *
 * @param adapter The active adapter, typically from {@link injectDateAdapter}.
 * @param piece Name of the calling directive, used in the error message.
 */
export function assertTimeCapable<D>(
  adapter: DateAdapter<D>,
  piece: string,
): TimeCapableDateAdapter<D> {
  if (
    typeof adapter.getHours !== 'function' ||
    typeof adapter.getMinutes !== 'function' ||
    typeof adapter.getSeconds !== 'function' ||
    typeof adapter.setTime !== 'function'
  ) {
    throw new Error(
      `[forty-cdk/date-adapter] ${piece} requires a time-capable DateAdapter. Provide one with ` +
        `provideNativeDateAdapter() or provideInternationalizedDateTimeAdapter() — the day-only ` +
        `provideInternationalizedDateAdapter() (CalendarDate) cannot carry a time.`,
    );
  }
  return adapter as TimeCapableDateAdapter<D>;
}
