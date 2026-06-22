import { inject, InjectionToken } from '@angular/core';

/**
 * Pluggable, date-library-agnostic seam for `ForCalendar`. Every internal
 * algorithm (paging, the day matrix, comparison, formatting) goes through a
 * `DateAdapter<D>`, so the primitive never hard-depends on a date library.
 *
 * The library ships two adapters behind {@link FOR_DATE_ADAPTER}:
 *
 * - `provideInternationalizedDateAdapter()` — over `@internationalized/date`'s
 *   immutable `CalendarDate`. Recommended for correct date-math and locale-aware
 *   formatting; `@internationalized/date` is an optional peer dependency. Both
 *   `@internationalized/date` adapters operate on the **Gregorian** calendar
 *   today — non-Gregorian calendar systems are deferred to the Temporal adapter
 *   track (#354).
 * - `provideNativeDateAdapter()` — over the built-in `Date`. Zero-dependency
 *   fallback.
 *
 * A `Temporal.PlainDate` adapter is a planned non-breaking addition once the
 * Temporal API is broadly available across browsers (#354).
 *
 * Implementations must be pure with respect to their date type: every
 * operation returns a value and never mutates its inputs. The `D` produced by
 * mutating operations (`add*`, `createDate`) is a fresh value, which keeps it
 * signal-friendly (reference equality changes on every change).
 *
 * @typeParam D The immutable date representation the adapter operates on.
 */
export interface DateAdapter<D> {
  /**
   * Today's date in the runtime time zone.
   *
   * **SSR / hydration caveat.** The result depends on the runtime time zone, so
   * a server render and a client hydration can disagree by up to a day near
   * midnight — the server may compute a different calendar day than the
   * browser. `ForCalendar` reads this once to mark the `data-today` /
   * `aria-current="date"` cell, so a mismatch surfaces there as a hydration
   * error and a flicker on the highlighted "today" cell.
   *
   * **SSR-safe pattern.** Have the consumer supply a fixed "today" (or pin a
   * time zone) for the server render, or defer the today-highlight to
   * `afterNextRender` so `today()` is only computed client-side. See the
   * calendar README's "SSR / hydration" section.
   */
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
   * Compares two dates by their natural ordering — **the full instant**,
   * including any time component the adapter's `D` carries. Returns a negative
   * number when `a` is before `b`, `0` when they are equal, and a positive
   * number when `a` is after `b`.
   *
   * This is the canonical comparator and the only one an adapter must
   * implement. Time-capable adapters (`Date`, `@internationalized/date`'s
   * `CalendarDateTime`) order by day *and* time; day-only adapters
   * (`CalendarDate`) order by day alone because that is all their `D` carries.
   *
   * **Bounds granularity.** `minDate` / `maxDate` clamping in the date
   * primitives compares the full instant through `compare`, so a date-time
   * `min`/`max` clamps identically on every time-capable adapter (e.g. native
   * `Date` and `CalendarDateTime` produce the same result for the same input).
   * For the *calendar grid*, where availability is day-granular so the boundary
   * day of a date-time `min`/`max` stays selectable, use {@link compareDateOf}
   * (which honours {@link compareDate} when present and otherwise derives a
   * day-only comparison from the y/m/d getters).
   */
  compare(a: D, b: D): number;

  /**
   * Optionally compares two dates by calendar day only, ignoring any time
   * component. Returns a negative number when `a`'s day is before `b`'s, `0`
   * when they fall on the same calendar day, and a positive number when `a`'s
   * day is after `b`'s.
   *
   * Adapters may **omit** this method: {@link compareDateOf} then derives the
   * day-only comparison from the {@link getYear} / {@link getMonth} /
   * {@link getDate} getters, which is correct for any adapter. Implement it only
   * to override that default (e.g. for a non-Gregorian ordering). Day-only
   * adapters whose {@link compare} already ignores time need not implement it.
   */
  compareDate?(a: D, b: D): number;

  /** Whether `a` and `b` fall on the same calendar day. */
  isSameDay(a: D, b: D): boolean;

  /** Whether `date` is a valid date of this adapter's type. */
  isValid(date: D): boolean;

  /**
   * Formats `date` for display using the runtime's default locale.
   *
   * **SSR / hydration caveat.** The result resolves against the runtime's
   * default locale, so a server render and a client hydration can produce
   * different strings when the server and browser locales differ — surfacing as
   * a hydration mismatch on every formatted value (heading, weekday headers,
   * cell labels). The runtime time zone applies too for adapters that format
   * through a wall-clock instant.
   *
   * **SSR-safe pattern.** Pin a locale (or format client-side) for the server
   * render so both environments resolve the same locale. See the calendar
   * README's "SSR / hydration" section.
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
 * Day-only comparison for `adapter`, honouring its optional
 * {@link DateAdapter.compareDate} when implemented and otherwise deriving the
 * ordering from the `getYear` / `getMonth` / `getDate` getters. Returns a
 * negative number when `a`'s calendar day is before `b`'s, `0` when they fall
 * on the same day, and a positive number when `a`'s day is after `b`'s.
 *
 * Use this for day-granular availability and bounds (e.g. the calendar grid),
 * where the boundary day of a date-time `min`/`max` must stay selectable on
 * every adapter. For full-instant ordering — including any time component —
 * call {@link DateAdapter.compare} directly.
 *
 * @typeParam D The adapter's immutable date representation.
 * @param adapter The active date adapter.
 * @param a The first date.
 * @param b The second date.
 */
export function compareDateOf<D>(adapter: DateAdapter<D>, a: D, b: D): number {
  if (adapter.compareDate) {
    return adapter.compareDate(a, b);
  }
  const ay = adapter.getYear(a);
  const by = adapter.getYear(b);
  if (ay !== by) {
    return ay - by;
  }
  const am = adapter.getMonth(a);
  const bm = adapter.getMonth(b);
  if (am !== bm) {
    return am - bm;
  }
  return adapter.getDate(a) - adapter.getDate(b);
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
