import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant toggle groups in the surrounding injector
 * scope. Configure with `provideForToggleDefaults` either at the application
 * root or in any component's `providers` array; partial overrides merge with
 * the parent scope.
 */
export interface ForToggleDefaults {
  /**
   * Whether arrow navigation wraps around past the first / last enabled
   * toggle-group item. Mirrors `ForRadioGroup`'s `loop` default.
   */
  loop: boolean;
}

const FALLBACK: ForToggleDefaults = {
  loop: true,
};

const { token, provideDefaults } = createDefaults<ForToggleDefaults>(
  'FOR_TOGGLE_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved toggle defaults for the current scope. */
export const FOR_TOGGLE_DEFAULTS = token;

/**
 * Configures forty-cdk toggle defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForToggleDefaults(defaults: Partial<ForToggleDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
