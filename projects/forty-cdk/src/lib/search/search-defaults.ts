import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant `[forSearch]` controls in the surrounding
 * injector scope. Configure with `provideForSearchDefaults`. The shape is a
 * stub today — present so future per-scope tuning can land without churning
 * the public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForSearchDefaults {}

const FALLBACK: ForSearchDefaults = {};

const { token, provideDefaults } = createDefaults<ForSearchDefaults>(
  'FOR_SEARCH_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved search-field defaults for the current scope. */
export const FOR_SEARCH_DEFAULTS = token;

/**
 * Configures forty-cdk search-field defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForSearchDefaults(defaults: Partial<ForSearchDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
