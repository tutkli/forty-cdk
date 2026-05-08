import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant toggles in the surrounding injector
 * scope. Configure with `provideForToggleDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForToggleDefaults {}

const FALLBACK: ForToggleDefaults = {};

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
