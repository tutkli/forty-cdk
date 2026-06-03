/** Which time part a segment edits. `dayPeriod` is the AM / PM toggle. */
export type TimeSegmentType = 'hour' | 'minute' | 'second' | 'dayPeriod';

/** Smallest editable time unit; controls which segments are rendered. */
export type TimeGranularity = 'hour' | 'minute' | 'second';

/** Spec for a single editable spinbutton segment. */
export interface EditableTimeSegmentSpec {
  readonly kind: 'editable';
  /** The time part this segment edits. */
  readonly type: TimeSegmentType;
  /** Maximum number of digits the segment accepts (`0` for the AM/PM toggle). */
  readonly digits: number;
}

/** Spec for a non-editable separator rendered between segments. */
export interface LiteralTimeSegmentSpec {
  readonly kind: 'literal';
  /** The separator characters (`:`, `.`, a space, …) for the runtime locale. */
  readonly literal: string;
}

/** A single entry in the locale-ordered segment list. */
export type TimeSegmentSpec = EditableTimeSegmentSpec | LiteralTimeSegmentSpec;

const DIGITS: Record<TimeSegmentType, number> = {
  hour: 2,
  minute: 2,
  second: 2,
  dayPeriod: 0,
};

// 1:23:45 PM — distinct hour / minute / second values and a PM reference so the
// `dayPeriod` part is present to read back. Only each part's `type` (and the
// separators) are used; the concrete value never surfaces.
const REFERENCE_TIME = new Date(2000, 0, 1, 13, 23, 45);
const AM_TIME = new Date(2000, 0, 1, 1);
const PM_TIME = new Date(2000, 0, 1, 13);

/**
 * Resolves the effective hour cycle. An explicit `12` / `24` always wins;
 * otherwise the runtime locale's preference is read from
 * `Intl.DateTimeFormat(...).resolvedOptions().hourCycle` (`h11` / `h12` → 12,
 * `h23` / `h24` → 24).
 *
 * @param locale BCP 47 locale, or `undefined` for the runtime default.
 * @param override The `hourCycle` input, or `null` to derive from the locale.
 */
export function resolveHourCycle(locale: string | undefined, override: 12 | 24 | null): 12 | 24 {
  if (override !== null) {
    return override;
  }
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h11' || cycle === 'h12' ? 12 : 24;
}

/**
 * Derives the ordered segment list for a time field from the runtime locale,
 * the resolved hour cycle, and the granularity, using
 * `Intl.DateTimeFormat(...).formatToParts`. The visible order of the segments
 * (and the separators between them), and whether an AM/PM `dayPeriod` segment
 * is present, follow the locale and the 12-/24-hour cycle.
 *
 * Pure: the same arguments always yield the same list, touching no signals or
 * DOM.
 *
 * @param locale BCP 47 locale, or `undefined` for the runtime default.
 * @param hourCycle Resolved hour cycle (`12` shows AM/PM, `24` does not).
 * @param granularity Smallest editable unit; trims minute / second segments.
 */
export function buildTimeSegments(
  locale: string | undefined,
  hourCycle: 12 | 24,
  granularity: TimeGranularity,
): readonly TimeSegmentSpec[] {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', hour12: hourCycle === 12 };
  if (granularity !== 'hour') {
    options.minute = '2-digit';
  }
  if (granularity === 'second') {
    options.second = '2-digit';
  }

  const parts = new Intl.DateTimeFormat(locale, options).formatToParts(REFERENCE_TIME);
  const segments: TimeSegmentSpec[] = [];
  for (const part of parts) {
    switch (part.type) {
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

/** Maps a 0-23 hour to its 12-hour display value and AM/PM period. */
export function to12(hour: number): { h12: number; pm: boolean } {
  return { h12: ((hour + 11) % 12) + 1, pm: hour >= 12 };
}

/** Combines a 1-12 display hour and an AM/PM period back into a 0-23 hour. */
export function from12(h12: number, pm: boolean): number {
  const base = h12 % 12;
  return pm ? base + 12 : base;
}

/**
 * Reads the localized AM / PM strings for a locale (e.g. `AM` / `PM`,
 * `a.m.` / `p.m.`, `午前` / `午後`). Pure.
 *
 * @param locale BCP 47 locale, or `undefined` for the runtime default.
 */
export function dayPeriodNames(locale: string | undefined): { am: string; pm: string } {
  const fmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true });
  const read = (date: Date): string =>
    fmt.formatToParts(date).find((part) => part.type === 'dayPeriod')?.value ?? '';
  return { am: read(AM_TIME) || 'AM', pm: read(PM_TIME) || 'PM' };
}
