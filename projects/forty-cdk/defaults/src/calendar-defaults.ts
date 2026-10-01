import { InjectionToken, type Provider } from '@angular/core';

import { provideDefaults } from './defaults';

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
  /**
   * Builds the accessible date of an outside-month padding day from the
   * formatted full date (default `"<date> (outside month)"`), so assistive tech
   * can tell it apart from the visible month. Used by the default `dateLabel`
   * formatter; a `ForCalendar` bound to its own `[dateLabel]` ignores it.
   */
  outsideMonthLabel: (formattedDate: string) => string;
}

/**
 * Library fallback for calendar defaults, read at the root injector when no
 * consumer has called `provideForCalendarDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_CALENDAR_FALLBACK_DEFAULTS: ForCalendarDefaults = {
  firstDayOfWeek: null,
  outsideMonthLabel: (formattedDate) => `${formattedDate} (outside month)`,
};

/** Token holding the resolved calendar defaults for the current scope. */
export const FOR_CALENDAR_DEFAULTS = new InjectionToken<ForCalendarDefaults>(
  'FOR_CALENDAR_DEFAULTS',
  {
    providedIn: 'root',
    factory: () => FOR_CALENDAR_FALLBACK_DEFAULTS,
  },
);

/**
 * Configures forty-cdk calendar defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 *
 * Pass a function instead of an object to build the overrides where
 * `inject()` is available; it runs once per injector that resolves the
 * defaults.
 */
export function provideForCalendarDefaults(
  defaults: Partial<ForCalendarDefaults> | (() => Partial<ForCalendarDefaults>) = {},
): Provider[] {
  return provideDefaults(FOR_CALENDAR_DEFAULTS, FOR_CALENDAR_FALLBACK_DEFAULTS, defaults);
}
