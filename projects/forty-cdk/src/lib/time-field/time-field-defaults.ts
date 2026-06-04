import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant `[forTimeField]` controls in the
 * surrounding injector scope. Configure with `provideForTimeFieldDefaults` at
 * the application root or in any component's `providers`; partial overrides
 * merge with the parent scope.
 */
export interface ForTimeFieldDefaults {
  /**
   * Accessible value announced (via `aria-valuetext`) for an empty editable
   * segment, so screen readers report the segment's empty state instead of
   * silence. Override for localization.
   */
  emptySegmentText: string;
}

const FALLBACK: ForTimeFieldDefaults = {
  emptySegmentText: 'Empty',
};

const { token, provideDefaults } = createDefaults<ForTimeFieldDefaults>(
  'FOR_TIME_FIELD_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved time-field defaults for the current scope. */
export const FOR_TIME_FIELD_DEFAULTS = token;

/**
 * Configures forty-cdk time-field defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForTimeFieldDefaults(
  defaults: Partial<ForTimeFieldDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
