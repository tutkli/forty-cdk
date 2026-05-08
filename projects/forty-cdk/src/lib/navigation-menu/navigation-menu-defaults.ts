import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant navigation menus in the surrounding
 * injector scope. Configure with `provideForNavigationMenuDefaults` either
 * at the application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForNavigationMenuDefaults {
  /** ms before a hover/focus opens an item. */
  delayDuration: number;
  /** ms before an item closes after hover leaves. */
  closeDelay: number;
  /**
   * ms after a peer item closed during which the next open is instant.
   * Keeps fluid hover-across-triggers feeling responsive.
   */
  skipDelayDuration: number;
}

const FALLBACK: ForNavigationMenuDefaults = {
  delayDuration: 200,
  closeDelay: 150,
  skipDelayDuration: 300,
};

const { token, provideDefaults } = createDefaults<ForNavigationMenuDefaults>(
  'FOR_NAVIGATION_MENU_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved navigation-menu defaults for the current scope. */
export const FOR_NAVIGATION_MENU_DEFAULTS = token;

/**
 * Configures forty-cdk navigation-menu defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or
 * library defaults at the root).
 */
export function provideForNavigationMenuDefaults(
  defaults: Partial<ForNavigationMenuDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
