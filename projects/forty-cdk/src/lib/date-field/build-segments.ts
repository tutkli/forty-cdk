/** Which calendar part an editable segment edits. */
export type DateSegmentType = 'day' | 'month' | 'year';

/** Spec for a single editable spinbutton segment. */
export interface EditableSegmentSpec {
  readonly kind: 'editable';
  /** The calendar part this segment edits. */
  readonly type: DateSegmentType;
  /** Maximum number of digits the segment accepts before it is full. */
  readonly digits: number;
}

/** Spec for a non-editable separator rendered between segments. */
export interface LiteralSegmentSpec {
  readonly kind: 'literal';
  /** The separator characters (`/`, `.`, `-`, …) for the runtime locale. */
  readonly literal: string;
}

/** A single entry in the locale-ordered segment list. */
export type SegmentSpec = EditableSegmentSpec | LiteralSegmentSpec;

const DIGITS: Record<DateSegmentType, number> = {
  day: 2,
  month: 2,
  year: 4,
};

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
export function buildSegments(locale: string | undefined): readonly SegmentSpec[] {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(REFERENCE_DATE);

  const segments: SegmentSpec[] = [];
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

// 1 Feb is deliberately distinct in day vs month so a locale that reuses a
// digit can't mask the part ordering. The year (2000) is irrelevant — only the
// `type` of each formatted part is read.
const REFERENCE_DATE = new Date(2000, 1, 1);
