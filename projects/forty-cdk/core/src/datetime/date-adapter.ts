import { inject } from '@angular/core';

import {
  type DateAdapter,
  FOR_DATE_ADAPTER,
  type TimeCapableDateAdapter,
} from 'forty-cdk/date-adapter';
import { fortyError } from '../errors/errors';

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
 * Injects the active {@link DateAdapter}, throwing a descriptive,
 * primitive-prefixed error when no adapter has been provided.
 *
 * @param piece Name of the calling directive, used in the error message.
 * @param options `scope` is the entry point the error reports under, e.g.
 *   `'date-field'`. Omit it from shared machinery that does not know one — the
 *   check then reports under `[forty-cdk/core]` and `piece` carries the
 *   attribution alone. The type stays inline on purpose: a named interface here
 *   would be a core symbol reached from a blessed public signature, so it would
 *   have to be published from `forty-cdk/shared` and carry that guarantee
 *   forever, for one optional string.
 */
export function injectDateAdapter<D>(
  piece: string,
  options?: { readonly scope?: string },
): DateAdapter<D> {
  const adapter = inject(FOR_DATE_ADAPTER, { optional: true });
  if (!adapter) {
    throw fortyError({
      code: 'FORCDK-CORE-002',
      scope: options?.scope,
      message: `${piece} requires a DateAdapter, and none is provided.`,
      fix:
        'Add provideNativeDateAdapter() or provideInternationalizedDateAdapter() to your ' +
        'application or component providers.',
    });
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
 * @param options `scope` is the entry point the error reports under — same
 *   contract, and same inline-type reasoning, as {@link injectDateAdapter}.
 */
export function assertTimeCapable<D>(
  adapter: DateAdapter<D>,
  piece: string,
  options?: { readonly scope?: string },
): TimeCapableDateAdapter<D> {
  if (
    typeof adapter.getHours !== 'function' ||
    typeof adapter.getMinutes !== 'function' ||
    typeof adapter.getSeconds !== 'function' ||
    typeof adapter.setTime !== 'function'
  ) {
    throw fortyError({
      code: 'FORCDK-CORE-003',
      scope: options?.scope,
      message: `${piece} requires a time-capable DateAdapter, and the active one is day-only.`,
      cause:
        'provideInternationalizedDateAdapter() supplies CalendarDate values, which carry no time ' +
        'of day, so the adapter implements none of the time accessors.',
      fix:
        'Switch to provideNativeDateAdapter() or provideInternationalizedDateTimeAdapter() in the ' +
        'providers that reach this piece.',
    });
  }
  return adapter as TimeCapableDateAdapter<D>;
}
