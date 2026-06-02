import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant fieldsets in the surrounding injector scope.
 * Configure with `provideForFieldsetDefaults`. The shape is a stub today —
 * present so future per-scope tuning can land without churning the public
 * surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForFieldsetDefaults {}

const FALLBACK: ForFieldsetDefaults = {};

const { token, provideDefaults } = createDefaults<ForFieldsetDefaults>(
  'FOR_FIELDSET_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved fieldset defaults for the current scope. */
export const FOR_FIELDSET_DEFAULTS = token;

/**
 * Configures forty-cdk fieldset defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForFieldsetDefaults(
  defaults: Partial<ForFieldsetDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
