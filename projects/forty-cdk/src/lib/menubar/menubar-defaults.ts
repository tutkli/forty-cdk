import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant menubars in the surrounding injector
 * scope. Configure with `provideForMenubarDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForMenubarDefaults {}

const FALLBACK: ForMenubarDefaults = {};

const { token, provideDefaults } = createDefaults<ForMenubarDefaults>(
  'FOR_MENUBAR_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved menubar defaults for the current scope. */
export const FOR_MENUBAR_DEFAULTS = token;

/**
 * Configures forty-cdk menubar defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForMenubarDefaults(defaults: Partial<ForMenubarDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
