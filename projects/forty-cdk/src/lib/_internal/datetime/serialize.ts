import {
  assertTimeCapable,
  type DateAdapter,
  type TimeCapableDateAdapter,
} from '../date-adapter/date-adapter';

/**
 * The granularity at which a date control serializes its value: a bare calendar
 * day, or a day plus a wall-clock time down to the hour, minute, or second.
 */
export type DateSerializeGranularity = 'day' | 'hour' | 'minute' | 'second';

/**
 * The granularity at which a time control serializes its value: a bare hour, or
 * an hour plus minutes, or down to the second.
 */
export type TimeSerializeGranularity = 'hour' | 'minute' | 'second';

/**
 * Clamps `date` into the inclusive `[min, max]` range, returning the nearer
 * bound when `date` falls outside and `date` itself when it is within (or both
 * bounds are `null`). Comparison defaults to {@link DateAdapter.compare} (the
 * full instant); pass `compare` to clamp on a different ordering — the calendar
 * grid clamps day-granularly via `compareDateOf`, the form controls clamp on the
 * full instant via `adapter.compare`.
 *
 * @typeParam D The adapter's immutable date representation.
 * @param adapter The active date adapter (supplies the default comparator).
 * @param date The date to clamp.
 * @param min The lower bound (inclusive), or `null` for unbounded.
 * @param max The upper bound (inclusive), or `null` for unbounded.
 * @param compare Comparator returning `< 0` / `0` / `> 0`; defaults to
 *   `adapter.compare`.
 */
export function clampToBounds<D>(
  adapter: DateAdapter<D>,
  date: D,
  min: D | null,
  max: D | null,
  compare: (a: D, b: D) => number = (a, b) => adapter.compare(a, b),
): D {
  if (min !== null && compare(date, min) < 0) {
    return min;
  }
  if (max !== null && compare(date, max) > 0) {
    return max;
  }
  return date;
}

/**
 * Serializes `date` to the ISO 8601 string the date controls write into their
 * native hidden input: `YYYY-MM-DD` at day granularity, `YYYY-MM-DDTHH:mm` at
 * hour / minute granularity, and `YYYY-MM-DDTHH:mm:ss` at second granularity.
 * At any non-day granularity the adapter must be time-capable; a day-only
 * adapter throws via {@link assertTimeCapable} with `piece` in the message.
 *
 * @typeParam D The adapter's immutable date representation.
 * @param adapter The active date adapter.
 * @param date The value to serialize.
 * @param granularity The serialization granularity.
 * @param piece Name of the calling directive, used in the time-capability error.
 */
export function serializeISODate<D>(
  adapter: DateAdapter<D>,
  date: D,
  granularity: DateSerializeGranularity,
  piece: string,
): string {
  const year = String(adapter.getYear(date)).padStart(4, '0');
  const month = String(adapter.getMonth(date)).padStart(2, '0');
  const day = String(adapter.getDate(date)).padStart(2, '0');
  const isoDate = `${year}-${month}-${day}`;
  if (granularity === 'day') {
    return isoDate;
  }
  const time = assertTimeCapable(adapter, piece);
  const hour = String(time.getHours(date)).padStart(2, '0');
  const minute = String(time.getMinutes(date)).padStart(2, '0');
  if (granularity === 'second') {
    const second = String(time.getSeconds(date)).padStart(2, '0');
    return `${isoDate}T${hour}:${minute}:${second}`;
  }
  return `${isoDate}T${hour}:${minute}`;
}

/**
 * Serializes the wall-clock time of `date` to the ISO 8601 partial-time string
 * the time controls write into their native hidden input: `HH` at hour
 * granularity, `HH:mm` at minute granularity, and `HH:mm:ss` at second
 * granularity.
 *
 * @typeParam D The adapter's immutable date-time representation.
 * @param adapter The active time-capable date adapter.
 * @param date The value whose time-of-day is serialized.
 * @param granularity The serialization granularity.
 */
export function serializeISOTime<D>(
  adapter: TimeCapableDateAdapter<D>,
  date: D,
  granularity: TimeSerializeGranularity,
): string {
  const hour = String(adapter.getHours(date)).padStart(2, '0');
  if (granularity === 'hour') {
    return hour;
  }
  const minute = String(adapter.getMinutes(date)).padStart(2, '0');
  if (granularity === 'minute') {
    return `${hour}:${minute}`;
  }
  const second = String(adapter.getSeconds(date)).padStart(2, '0');
  return `${hour}:${minute}:${second}`;
}

/**
 * Grafts the wall-clock time of `source` onto the calendar day of `day`,
 * returning a fresh date that keeps `day`'s date and carries `source`'s
 * hour / minute / second. Used when composing a date selection with a separately
 * edited time-of-day.
 *
 * @typeParam D The adapter's immutable date-time representation.
 * @param adapter The active time-capable date adapter.
 * @param day The date contributing the calendar day.
 * @param source The date contributing the wall-clock time.
 */
export function composeWithTime<D>(adapter: TimeCapableDateAdapter<D>, day: D, source: D): D {
  return adapter.setTime(
    day,
    adapter.getHours(source),
    adapter.getMinutes(source),
    adapter.getSeconds(source),
  );
}

/**
 * The fixed, DST-stable sentinel date (`2000-01-01`) a time control anchors a
 * wall-clock time to when it has no committed date of its own, so a time always
 * round-trips through the adapter without an ambiguous-hour DST shift.
 *
 * @typeParam D The adapter's immutable date representation.
 * @param adapter The active date adapter.
 */
export function timeSentinel<D>(adapter: DateAdapter<D>): D {
  return adapter.createDate(2000, 1, 1);
}

/**
 * Reduces the wall-clock time of `date` to seconds-of-day (`hours * 3600 +
 * minutes * 60 + seconds`), ignoring the calendar day. Used to compare or clamp
 * two dates by their time-of-day alone.
 *
 * @typeParam D The adapter's immutable date-time representation.
 * @param adapter The active time-capable date adapter.
 * @param date The value whose time-of-day is reduced.
 */
export function secondsOfDay<D>(adapter: TimeCapableDateAdapter<D>, date: D): number {
  return adapter.getHours(date) * 3600 + adapter.getMinutes(date) * 60 + adapter.getSeconds(date);
}
