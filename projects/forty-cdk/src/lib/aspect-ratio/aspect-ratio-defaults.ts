import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant aspect-ratio containers in the surrounding
 * injector scope. Configure with `provideForAspectRatioDefaults`. The shape
 * is a stub today — present so future per-scope tuning can land without
 * churning the public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForAspectRatioDefaults {}

const FALLBACK: ForAspectRatioDefaults = {};

const { token, provideDefaults } = createDefaults<ForAspectRatioDefaults>(
  'FOR_ASPECT_RATIO_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved aspect-ratio defaults for the current scope. */
export const FOR_ASPECT_RATIO_DEFAULTS = token;

/**
 * Configures forty-cdk aspect-ratio defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForAspectRatioDefaults(
  defaults: Partial<ForAspectRatioDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
