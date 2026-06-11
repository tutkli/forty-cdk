import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';
import type { DateTimeSegmentType } from './build-segments';

/**
 * Accessible name announced for each editable segment, keyed by its part type.
 * Override individually (or wholesale) for localization; any key left unset
 * falls back to the library default for that part — so overriding just
 * `dayPeriod` keeps the English labels for the rest.
 */
export type ForDateFieldSegmentLabels = Partial<Record<DateTimeSegmentType, string>>;

/**
 * Defaults inherited by descendant `[forDateField]` controls in the
 * surrounding injector scope. Configure with `provideForDateFieldDefaults` at
 * the application root or in any component's `providers`; partial overrides
 * merge with the parent scope.
 */
export interface ForDateFieldDefaults {
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
  segmentLabels: ForDateFieldSegmentLabels;
}

/**
 * Library default accessible name for each editable segment. Used when neither
 * the segment's explicit `ariaLabel` nor a `provideForDateFieldDefaults`
 * override supplies one for that part.
 */
export const DEFAULT_DATE_FIELD_SEGMENT_LABELS: Readonly<Record<DateTimeSegmentType, string>> = {
  day: 'day',
  month: 'month',
  year: 'year',
  hour: 'hour',
  minute: 'minute',
  second: 'second',
  dayPeriod: 'AM/PM',
};

const FALLBACK: ForDateFieldDefaults = {
  emptySegmentText: 'Empty',
  segmentLabels: DEFAULT_DATE_FIELD_SEGMENT_LABELS,
};

const { token, provideDefaults } = createDefaults<ForDateFieldDefaults>(
  'FOR_DATE_FIELD_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved date-field defaults for the current scope. */
export const FOR_DATE_FIELD_DEFAULTS = token;

/**
 * Configures forty-cdk date-field defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForDateFieldDefaults(
  defaults: Partial<ForDateFieldDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
