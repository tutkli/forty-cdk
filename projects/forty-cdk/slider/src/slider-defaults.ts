import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant sliders in the surrounding injector
 * scope. Configure with `provideForSliderDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForSliderDefaults {
  /** Step used for `PageUp` / `PageDown`. Defaults to 10× `step`. */
  largeStep: number;
}

/**
 * Library fallback for slider defaults, read at the root injector when no
 * consumer has called `provideForSliderDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_SLIDER_FALLBACK_DEFAULTS: ForSliderDefaults = {
  largeStep: 10,
};

const { token, provideDefaults } = createDefaults<ForSliderDefaults>(
  'FOR_SLIDER_DEFAULTS',
  FOR_SLIDER_FALLBACK_DEFAULTS,
);

/** Token holding the resolved slider defaults for the current scope. */
export const FOR_SLIDER_DEFAULTS = token;

/**
 * Configures forty-cdk slider defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForSliderDefaults(defaults: Partial<ForSliderDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
