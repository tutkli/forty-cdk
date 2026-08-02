import { type Provider } from '@angular/core';

import { createDefaults, type TimeSegmentType } from 'forty-cdk/core';

/**
 * Accessible name announced for each editable segment, keyed by its part type.
 * Override individually (or wholesale) for localization; any key left unset
 * falls back to the library default for that part — so overriding just
 * `dayPeriod` keeps the English labels for the rest.
 */
export type ForTimeRangeFieldSegmentLabels = Partial<Record<TimeSegmentType, string>>;

/**
 * Defaults inherited by descendant `[forTimeRangeField]` controls in the
 * surrounding injector scope. Configure with `provideForTimeRangeFieldDefaults`
 * at the application root or in any component's `providers`; partial overrides
 * merge with the parent scope.
 */
export interface ForTimeRangeFieldDefaults {
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
  segmentLabels: ForTimeRangeFieldSegmentLabels;
  /**
   * Accessible name announced (via `aria-label`) for the start endpoint group,
   * used when `[forTimeRangeFieldStart]` has no explicit `ariaLabel`.
   */
  startLabel: string;
  /**
   * Accessible name announced (via `aria-label`) for the end endpoint group,
   * used when `[forTimeRangeFieldEnd]` has no explicit `ariaLabel`.
   */
  endLabel: string;
}

/**
 * Library default accessible name for each editable segment. Used when neither
 * the segment's explicit `ariaLabel` nor a `provideForTimeRangeFieldDefaults`
 * override supplies one for that part.
 */
export const DEFAULT_TIME_RANGE_FIELD_SEGMENT_LABELS: Readonly<Record<TimeSegmentType, string>> = {
  hour: 'hour',
  minute: 'minute',
  second: 'second',
  dayPeriod: 'AM/PM',
};

/**
 * Library fallback for time-range-field defaults, read at the root injector when
 * no consumer has called `provideForTimeRangeFieldDefaults`. Exported for the
 * shared defaults contract spec; not re-exported from the primitive's public
 * entry.
 */
export const FOR_TIME_RANGE_FIELD_FALLBACK_DEFAULTS: ForTimeRangeFieldDefaults = {
  emptySegmentText: 'Empty',
  segmentLabels: DEFAULT_TIME_RANGE_FIELD_SEGMENT_LABELS,
  startLabel: 'Start time',
  endLabel: 'End time',
};

const { token, provideDefaults } = createDefaults<ForTimeRangeFieldDefaults>(
  'FOR_TIME_RANGE_FIELD_DEFAULTS',
  FOR_TIME_RANGE_FIELD_FALLBACK_DEFAULTS,
);

/** Token holding the resolved time-range-field defaults for the current scope. */
export const FOR_TIME_RANGE_FIELD_DEFAULTS = token;

/**
 * Configures forty-cdk time-range-field defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForTimeRangeFieldDefaults(
  defaults: Partial<ForTimeRangeFieldDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
