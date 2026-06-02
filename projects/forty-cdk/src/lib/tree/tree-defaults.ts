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

const FALLBACK: ForTreeDefaults = {
  selectionFollowsFocus: false,
};

const { token, provideDefaults } = createDefaults<ForTreeDefaults>('FOR_TREE_DEFAULTS', FALLBACK);

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
