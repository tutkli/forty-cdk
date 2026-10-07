import { InjectionToken, type Provider } from '@angular/core';

import type { LocalizableText, SegmentType } from 'forty-cdk/core';

import { provideDefaults } from './defaults';

/**
 * Accessible name announced for each editable segment, keyed by its part type.
 * Override individually (or wholesale) for localization; any key left unset
 * keeps the parent scope's label, else the library default for that part — so
 * overriding just `dayPeriod` keeps the labels for the rest.
 */
export type ForDateRangeFieldSegmentLabels = Partial<Record<SegmentType, LocalizableText>>;

/**
 * Defaults inherited by descendant `[forDateRangeField]` controls in the
 * surrounding injector scope. Configure with `provideForDateRangeFieldDefaults`
 * at the application root or in any component's `providers`; partial overrides
 * merge with the parent scope.
 */
export interface ForDateRangeFieldDefaults {
  /**
   * Accessible value announced (via `aria-valuetext`) for an empty editable
   * segment, so screen readers report the segment's empty state instead of
   * silence. Override for localization.
   */
  emptySegmentText: LocalizableText;
  /**
   * Accessible names announced for each editable segment (via `aria-label`),
   * keyed by part type, used when a segment has no explicit `ariaLabel`. The
   * AM/PM `dayPeriod` defaults to `'AM/PM'` instead of leaking the raw token.
   * Override for localization; a nested scope merges this record entry by
   * entry with its parent's, and keys no scope sets keep the library default.
   */
  segmentLabels: ForDateRangeFieldSegmentLabels;
  /**
   * Placeholder each empty editable segment shows, keyed by part type, for
   * fields whose `[placeholder]` doesn't name that part. A nested scope merges
   * this record entry by entry with its parent's, and parts no scope names fall
   * back to a letter-repeat default (`dd` / `mm` / `yyyy` / `hh` / `mm` / `ss` / `--`).
   */
  placeholder: Partial<Record<SegmentType, LocalizableText>>;
  /**
   * Accessible name announced (via `aria-label`) for the start endpoint group,
   * used when `[forDateRangeFieldStart]` has no explicit `ariaLabel`.
   */
  startLabel: LocalizableText;
  /**
   * Accessible name announced (via `aria-label`) for the end endpoint group,
   * used when `[forDateRangeFieldEnd]` has no explicit `ariaLabel`.
   */
  endLabel: LocalizableText;
  /**
   * 12- or 24-hour cycle for range fields that don't bind `[hourCycle]`. Library
   * fallback `null`, which derives the cycle from the locale.
   */
  hourCycle: 12 | 24 | null;
}

/**
 * Library default accessible name for each editable segment. Used when neither
 * the segment's explicit `ariaLabel` nor a `provideForDateRangeFieldDefaults`
 * override supplies one for that part.
 */
export const DEFAULT_DATE_RANGE_FIELD_SEGMENT_LABELS: Readonly<Record<SegmentType, string>> = {
  day: 'day',
  month: 'month',
  year: 'year',
  hour: 'hour',
  minute: 'minute',
  second: 'second',
  dayPeriod: 'AM/PM',
};

/**
 * Library fallback for date-range-field defaults, read at the root injector when
 * no consumer has called `provideForDateRangeFieldDefaults`. Exported for the
 * shared defaults contract spec; not re-exported from the primitive's public
 * entry.
 */
export const FOR_DATE_RANGE_FIELD_FALLBACK_DEFAULTS: ForDateRangeFieldDefaults = {
  emptySegmentText: 'Empty',
  segmentLabels: DEFAULT_DATE_RANGE_FIELD_SEGMENT_LABELS,
  placeholder: {},
  startLabel: 'Start date',
  endLabel: 'End date',
  hourCycle: null,
};

/** Token holding the resolved date-range-field defaults for the current scope. */
export const FOR_DATE_RANGE_FIELD_DEFAULTS = new InjectionToken<ForDateRangeFieldDefaults>(
  'FOR_DATE_RANGE_FIELD_DEFAULTS',
  {
    providedIn: 'root',
    factory: () => FOR_DATE_RANGE_FIELD_FALLBACK_DEFAULTS,
  },
);

/**
 * Configures forty-cdk date-range-field defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 *
 * Pass a function instead of an object to build the overrides where
 * `inject()` is available; it runs once per injector that resolves the
 * defaults.
 */
export function provideForDateRangeFieldDefaults(
  defaults: Partial<ForDateRangeFieldDefaults> | (() => Partial<ForDateRangeFieldDefaults>) = {},
): Provider[] {
  return provideDefaults(
    FOR_DATE_RANGE_FIELD_DEFAULTS,
    FOR_DATE_RANGE_FIELD_FALLBACK_DEFAULTS,
    defaults,
    ['segmentLabels', 'placeholder'],
  );
}
