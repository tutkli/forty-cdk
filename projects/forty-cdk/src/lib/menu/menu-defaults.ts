import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant menus in the surrounding injector
 * scope. Configure with `provideForMenuDefaults`. The shape is a stub
 * today — present so future per-scope tuning (typeahead reset window,
 * pointer-grace policy) can land without churning the public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForMenuDefaults {}

const FALLBACK: ForMenuDefaults = {};

const { token, provideDefaults } = createDefaults<ForMenuDefaults>('FOR_MENU_DEFAULTS', FALLBACK);

/** Token holding the resolved menu defaults for the current scope. */
export const FOR_MENU_DEFAULTS = token;

/**
 * Configures forty-cdk menu defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForMenuDefaults(defaults: Partial<ForMenuDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
