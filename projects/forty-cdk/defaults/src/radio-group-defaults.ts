import { InjectionToken, type Provider } from '@angular/core';

import { provideDefaults } from './defaults';

/**
 * Defaults inherited by descendant radio groups in the surrounding injector
 * scope. Configure with `provideForRadioGroupDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForRadioGroupDefaults {
  /**
   * Whether arrow navigation wraps around past the first / last enabled
   * radio. Matches the WAI-ARIA Radio Group APG default.
   */
  loop: boolean;
}

/**
 * Library fallback for radio group defaults, read at the root injector when no
 * consumer has called `provideForRadioGroupDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_RADIO_GROUP_FALLBACK_DEFAULTS: ForRadioGroupDefaults = {
  loop: true,
};

/** Token holding the resolved radio-group defaults for the current scope. */
export const FOR_RADIO_GROUP_DEFAULTS = new InjectionToken<ForRadioGroupDefaults>(
  'FOR_RADIO_GROUP_DEFAULTS',
  {
    providedIn: 'root',
    factory: () => FOR_RADIO_GROUP_FALLBACK_DEFAULTS,
  },
);

/**
 * Configures forty-cdk radio-group defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 *
 * Pass a function instead of an object to build the overrides where
 * `inject()` is available; it runs once per injector that resolves the
 * defaults.
 */
export function provideForRadioGroupDefaults(
  defaults: Partial<ForRadioGroupDefaults> | (() => Partial<ForRadioGroupDefaults>) = {},
): Provider[] {
  return provideDefaults(FOR_RADIO_GROUP_DEFAULTS, FOR_RADIO_GROUP_FALLBACK_DEFAULTS, defaults);
}
