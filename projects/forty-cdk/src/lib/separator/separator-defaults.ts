import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant separators in the surrounding injector
 * scope. Configure with `provideForSeparatorDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForSeparatorDefaults {}

const FALLBACK: ForSeparatorDefaults = {};

const { token, provideDefaults } = createDefaults<ForSeparatorDefaults>(
  'FOR_SEPARATOR_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved separator defaults for the current scope. */
export const FOR_SEPARATOR_DEFAULTS = token;

/**
 * Configures forty-cdk separator defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForSeparatorDefaults(
  defaults: Partial<ForSeparatorDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
