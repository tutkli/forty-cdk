import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant toolbars in the surrounding injector
 * scope. Configure with `provideForToolbarDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForToolbarDefaults {
  /**
   * Whether arrow navigation wraps around past the first / last enabled
   * item. Matches the WAI-ARIA Toolbar APG default.
   */
  loop: boolean;
}

/**
 * Library fallback for toolbar defaults, read at the root injector when no
 * consumer has called `provideForToolbarDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_TOOLBAR_FALLBACK_DEFAULTS: ForToolbarDefaults = {
  loop: true,
};

const { token, provideDefaults } = createDefaults<ForToolbarDefaults>(
  'FOR_TOOLBAR_DEFAULTS',
  FOR_TOOLBAR_FALLBACK_DEFAULTS,
);

/** Token holding the resolved toolbar defaults for the current scope. */
export const FOR_TOOLBAR_DEFAULTS = token;

/**
 * Configures forty-cdk toolbar defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForToolbarDefaults(defaults: Partial<ForToolbarDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
