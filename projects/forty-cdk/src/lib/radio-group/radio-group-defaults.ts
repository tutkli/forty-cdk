import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

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

const FALLBACK: ForRadioGroupDefaults = {
  loop: true,
};

const { token, provideDefaults } = createDefaults<ForRadioGroupDefaults>(
  'FOR_RADIO_GROUP_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved radio-group defaults for the current scope. */
export const FOR_RADIO_GROUP_DEFAULTS = token;

/**
 * Configures forty-cdk radio-group defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForRadioGroupDefaults(
  defaults: Partial<ForRadioGroupDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
