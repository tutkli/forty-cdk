import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant tables in the surrounding injector scope.
 * Configure with `provideForTableDefaults`. The shape is a stub today — present
 * so future per-scope tuning can land without churning the public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForTableDefaults {}

const FALLBACK: ForTableDefaults = {};

const { token, provideDefaults } = createDefaults<ForTableDefaults>('FOR_TABLE_DEFAULTS', FALLBACK);

/** Token holding the resolved table defaults for the current scope. */
export const FOR_TABLE_DEFAULTS = token;

/**
 * Configures forty-cdk table defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForTableDefaults(defaults: Partial<ForTableDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
