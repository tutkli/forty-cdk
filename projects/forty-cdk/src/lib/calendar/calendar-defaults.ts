import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant calendars in the surrounding injector
 * scope. Configure with `provideForCalendarDefaults` at the application root
 * or in any component's `providers`; partial overrides merge with the parent
 * scope.
 */
export interface ForCalendarDefaults {
  /**
   * First day of the week as a **0-6** index (`0` = Sunday, `1` = Monday, …).
   * When `null` (default), each calendar falls back to its adapter's
   * `getFirstDayOfWeek()`. A `ForCalendar`'s own `firstDayOfWeek` input always
   * wins over this scope default.
   */
  firstDayOfWeek: number | null;
}

/**
 * Library fallback for calendar defaults, read at the root injector when no
 * consumer has called `provideForCalendarDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_CALENDAR_FALLBACK_DEFAULTS: ForCalendarDefaults = {
  firstDayOfWeek: null,
};

const { token, provideDefaults } = createDefaults<ForCalendarDefaults>(
  'FOR_CALENDAR_DEFAULTS',
  FOR_CALENDAR_FALLBACK_DEFAULTS,
);

/** Token holding the resolved calendar defaults for the current scope. */
export const FOR_CALENDAR_DEFAULTS = token;

/**
 * Configures forty-cdk calendar defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForCalendarDefaults(
  defaults: Partial<ForCalendarDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
