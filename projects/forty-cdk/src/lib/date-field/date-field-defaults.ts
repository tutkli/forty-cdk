import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

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
}

const FALLBACK: ForDateFieldDefaults = {
  emptySegmentText: 'Empty',
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
