import { type FieldSpec, type SegmentType } from './segment-editor';

/** Date-time precision of a date field; `'day'` keeps it date-only. */
export type FieldGranularity = 'day' | 'hour' | 'minute' | 'second';

const DIGITS: Record<SegmentType, number> = {
  day: 2,
  month: 2,
  year: 4,
  hour: 2,
  minute: 2,
  second: 2,
  dayPeriod: 0,
};

// 1 Feb is deliberately distinct in day vs month so a locale that reuses a
// digit can't mask the part ordering. The year (2000) is irrelevant — only the
// `type` of each formatted part is read.
const REFERENCE_DATE = new Date(2000, 1, 1);

// 1 Feb 2000, 1:23:45 PM — distinct day / month and hour / minute / second, in
// the afternoon so the `dayPeriod` part is present to read back.
const REFERENCE_DATE_TIME = new Date(2000, 1, 1, 13, 23, 45);

/**
 * Derives the ordered segment list for a day-granularity date field from the
 * runtime locale, using `Intl.DateTimeFormat(...).formatToParts`. The visible
 * order of day / month / year (and the separator characters between them)
 * follows the locale — `MM/DD/YYYY` for `en-US`, `DD.MM.YYYY` for `de-DE`,
 * `YYYY/MM/DD` for `ja-JP` — so the field never has to parse ambiguous
 * free text.
 *
 * Pure: the same `locale` always yields the same list, and it touches no
 * signals or DOM. A fixed reference date with distinct day / month values is
 * formatted purely to read back the part order; its actual value never
 * surfaces.
 *
 * @param locale BCP 47 locale, or `undefined` for the runtime default.
 */
export function buildSegments(locale: string | undefined): readonly FieldSpec[] {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(REFERENCE_DATE);

  const segments: FieldSpec[] = [];
  for (const part of parts) {
    switch (part.type) {
      case 'day':
      case 'month':
      case 'year':
        segments.push({ kind: 'editable', type: part.type, digits: DIGITS[part.type] });
        break;
      case 'literal':
        segments.push({ kind: 'literal', literal: part.value });
        break;
      default:
        break;
    }
  }
  return segments;
}

/**
 * Derives the ordered segment list for a date(-time) field. At
 * `granularity === 'day'` this is exactly {@link buildSegments} (date-only,
 * byte-for-byte). At a finer granularity it appends the locale-ordered time
 * segments (and the date↔time separator) by formatting a reference date-time
 * with both date and time options in a single `Intl.DateTimeFormat` pass, so
 * the order of every part — and whether an AM/PM `dayPeriod` is present —
 * follows the locale and the resolved hour cycle.
 *
 * Pure: the same arguments always yield the same list.
 *
 * @param locale BCP 47 locale, or `undefined` for the runtime default.
 * @param granularity Smallest editable unit; `'day'` stays date-only.
 * @param hourCycle Resolved hour cycle (`12` shows AM/PM, `24` does not).
 */
export function buildDateTimeSegments(
  locale: string | undefined,
  granularity: FieldGranularity,
  hourCycle: 12 | 24,
): readonly FieldSpec[] {
  if (granularity === 'day') {
    return buildSegments(locale);
  }
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: hourCycle === 12,
  };
  if (granularity !== 'hour') {
    options.minute = '2-digit';
  }
  if (granularity === 'second') {
    options.second = '2-digit';
  }

  const parts = new Intl.DateTimeFormat(locale, options).formatToParts(REFERENCE_DATE_TIME);
  const segments: FieldSpec[] = [];
  for (const part of parts) {
    switch (part.type) {
      case 'day':
      case 'month':
      case 'year':
      case 'hour':
      case 'minute':
      case 'second':
      case 'dayPeriod':
        segments.push({ kind: 'editable', type: part.type, digits: DIGITS[part.type] });
        break;
      case 'literal':
        segments.push({ kind: 'literal', literal: part.value });
        break;
      default:
        break;
    }
  }
  return segments;
}
