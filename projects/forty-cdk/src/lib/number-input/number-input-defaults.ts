import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant `[forNumberInput]` controls in the
 * surrounding injector scope. Configure with `provideForNumberInputDefaults`
 * either at the application root or in any component's `providers` array;
 * partial overrides merge with the parent scope.
 */
export interface ForNumberInputDefaults {
  /**
   * Multiplier applied to `step` for `PageUp` / `PageDown`. Defaults to `10`,
   * so a step of `1` pages by `10`.
   */
  stepMultiplier: number;
}

/**
 * Library fallback for number-input defaults, read at the root injector when no
 * consumer has called `provideForNumberInputDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_NUMBER_INPUT_FALLBACK_DEFAULTS: ForNumberInputDefaults = {
  stepMultiplier: 10,
};

const { token, provideDefaults } = createDefaults<ForNumberInputDefaults>(
  'FOR_NUMBER_INPUT_DEFAULTS',
  FOR_NUMBER_INPUT_FALLBACK_DEFAULTS,
);

/** Token holding the resolved number-input defaults for the current scope. */
export const FOR_NUMBER_INPUT_DEFAULTS = token;

/**
 * Configures forty-cdk number-input defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForNumberInputDefaults(
  defaults: Partial<ForNumberInputDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
