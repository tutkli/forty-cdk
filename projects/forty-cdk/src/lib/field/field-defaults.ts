import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant fields in the surrounding injector scope.
 * Configure with `provideForFieldDefaults`. The shape is a stub today —
 * present so future per-scope tuning can land without churning the public
 * surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForFieldDefaults {}

const FALLBACK: ForFieldDefaults = {};

const { token, provideDefaults } = createDefaults<ForFieldDefaults>(
  'FOR_FIELD_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved field defaults for the current scope. */
export const FOR_FIELD_DEFAULTS = token;

/**
 * Configures forty-cdk field defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForFieldDefaults(defaults: Partial<ForFieldDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
