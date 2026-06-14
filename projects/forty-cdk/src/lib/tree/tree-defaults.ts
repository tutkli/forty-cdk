import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant trees in the surrounding injector scope.
 * Configure with `provideForTreeDefaults` either at the application root or in
 * any component's `providers` array; partial overrides merge with the parent
 * scope.
 */
export interface ForTreeDefaults {
  /**
   * Single-mode only: when `true`, arrow navigation also selects the focused
   * node. APG calls this optional and recommends caution — leave `false`
   * unless the UX truly benefits from selection following focus.
   */
  selectionFollowsFocus: boolean;
}

/**
 * Library fallback for tree defaults, read at the root injector when no
 * consumer has called `provideForTreeDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_TREE_FALLBACK_DEFAULTS: ForTreeDefaults = {
  selectionFollowsFocus: false,
};

const { token, provideDefaults } = createDefaults<ForTreeDefaults>(
  'FOR_TREE_DEFAULTS',
  FOR_TREE_FALLBACK_DEFAULTS,
);

/** Token holding the resolved tree defaults for the current scope. */
export const FOR_TREE_DEFAULTS = token;

/**
 * Configures forty-cdk tree defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForTreeDefaults(defaults: Partial<ForTreeDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
