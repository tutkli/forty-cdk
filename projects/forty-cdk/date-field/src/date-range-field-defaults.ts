import { type Provider } from '@angular/core';

import { createDefaults, type SegmentType } from 'forty-cdk/core';

/**
 * Accessible name announced for each editable segment, keyed by its part type.
 * Override individually (or wholesale) for localization; any key left unset
 * falls back to the library default for that part — so overriding just
 * `dayPeriod` keeps the English labels for the rest.
 */
export type ForDateRangeFieldSegmentLabels = Partial<Record<SegmentType, string>>;

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
  emptySegmentText: string;
  /**
   * Accessible names announced for each editable segment (via `aria-label`),
   * keyed by part type, used when a segment has no explicit `ariaLabel`. The
   * AM/PM `dayPeriod` defaults to `'AM/PM'` instead of leaking the raw token.
   * Override for localization; unset keys keep the library default.
   */
  segmentLabels: ForDateRangeFieldSegmentLabels;
  /**
   * Accessible name announced (via `aria-label`) for the start endpoint group,
   * used when `[forDateRangeFieldStart]` has no explicit `ariaLabel`.
   */
  startLabel: string;
  /**
   * Accessible name announced (via `aria-label`) for the end endpoint group,
   * used when `[forDateRangeFieldEnd]` has no explicit `ariaLabel`.
   */
  endLabel: string;
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
  startLabel: 'Start date',
  endLabel: 'End date',
};

const { token, provideDefaults } = createDefaults<ForDateRangeFieldDefaults>(
  'FOR_DATE_RANGE_FIELD_DEFAULTS',
  FOR_DATE_RANGE_FIELD_FALLBACK_DEFAULTS,
);

/** Token holding the resolved date-range-field defaults for the current scope. */
export const FOR_DATE_RANGE_FIELD_DEFAULTS = token;

/**
 * Configures forty-cdk date-range-field defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForDateRangeFieldDefaults(
  defaults: Partial<ForDateRangeFieldDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
