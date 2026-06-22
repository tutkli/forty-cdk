import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant switches in the surrounding injector
 * scope. Configure with `provideForSwitchDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForSwitchDefaults {}

const FALLBACK: ForSwitchDefaults = {};

const { token, provideDefaults } = createDefaults<ForSwitchDefaults>(
  'FOR_SWITCH_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved switch defaults for the current scope. */
export const FOR_SWITCH_DEFAULTS = token;

/**
 * Configures forty-cdk switch defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForSwitchDefaults(defaults: Partial<ForSwitchDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
