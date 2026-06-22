import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant checkboxes in the surrounding injector
 * scope. Configure with `provideForCheckboxDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForCheckboxDefaults {}

const FALLBACK: ForCheckboxDefaults = {};

const { token, provideDefaults } = createDefaults<ForCheckboxDefaults>(
  'FOR_CHECKBOX_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved checkbox defaults for the current scope. */
export const FOR_CHECKBOX_DEFAULTS = token;

/**
 * Configures forty-cdk checkbox defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForCheckboxDefaults(
  defaults: Partial<ForCheckboxDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
