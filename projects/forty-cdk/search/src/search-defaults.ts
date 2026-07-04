import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant search fields in the surrounding injector
 * scope. Configure with `provideForSearchDefaults` either at the application
 * root or in any component's `providers` array; partial overrides merge with
 * the parent scope.
 */
export interface ForSearchDefaults {
  /**
   * Accessible name for the clear button (`[forSearchClear]`), for clear
   * buttons that don't set `[ariaLabel]` locally. Localize it here to
   * translate every search clear button in the scope.
   */
  clearAriaLabel: string;
}

/**
 * Library fallback for search defaults, read at the root injector when no
 * consumer has called `provideForSearchDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_SEARCH_FALLBACK_DEFAULTS: ForSearchDefaults = {
  clearAriaLabel: 'Clear',
};

const { token, provideDefaults } = createDefaults<ForSearchDefaults>(
  'FOR_SEARCH_DEFAULTS',
  FOR_SEARCH_FALLBACK_DEFAULTS,
);

/** Token holding the resolved search defaults for the current scope. */
export const FOR_SEARCH_DEFAULTS = token;

/**
 * Configures forty-cdk search defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForSearchDefaults(defaults: Partial<ForSearchDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
