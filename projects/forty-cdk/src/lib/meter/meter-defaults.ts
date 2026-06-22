import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant meters in the surrounding injector
 * scope. Configure with `provideForMeterDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForMeterDefaults {}

const FALLBACK: ForMeterDefaults = {};

const { token, provideDefaults } = createDefaults<ForMeterDefaults>('FOR_METER_DEFAULTS', FALLBACK);

/** Token holding the resolved meter defaults for the current scope. */
export const FOR_METER_DEFAULTS = token;

/**
 * Configures forty-cdk meter defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForMeterDefaults(defaults: Partial<ForMeterDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
