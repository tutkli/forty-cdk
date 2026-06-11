import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant `[forInput]` / `[forTextarea]` controls in
 * the surrounding injector scope. Configure with `provideForInputDefaults`.
 * The shape is a stub today — present so future per-scope tuning can land
 * without churning the public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForInputDefaults {}

const FALLBACK: ForInputDefaults = {};

const { token, provideDefaults } = createDefaults<ForInputDefaults>('FOR_INPUT_DEFAULTS', FALLBACK);

/** Token holding the resolved text-input defaults for the current scope. */
export const FOR_INPUT_DEFAULTS = token;

/**
 * Configures forty-cdk text-input defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForInputDefaults(defaults: Partial<ForInputDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
