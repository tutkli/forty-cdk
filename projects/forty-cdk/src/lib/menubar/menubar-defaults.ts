import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant menubars in the surrounding injector
 * scope. Configure with `provideForMenubarDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForMenubarDefaults {
  /** ms before the open menu closes after the pointer leaves the bar. */
  closeDelay: number;
}

/**
 * Library fallback for menubar defaults, read at the root injector when no
 * consumer has called `provideForMenubarDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_MENUBAR_FALLBACK_DEFAULTS: ForMenubarDefaults = {
  closeDelay: 150,
};

const { token, provideDefaults } = createDefaults<ForMenubarDefaults>(
  'FOR_MENUBAR_DEFAULTS',
  FOR_MENUBAR_FALLBACK_DEFAULTS,
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
