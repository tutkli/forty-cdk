import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant dropdown menus in the surrounding
 * injector scope. Configure with `provideForDropdownMenuDefaults` either
 * at the application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForDropdownMenuDefaults {
  /**
   * Distance (px) between the dropdown trigger and the floating content
   * along the resolved `side` axis. Mirrors Radix's `sideOffset`.
   */
  sideOffset: number;
  /**
   * Padding (px) added to the viewport edges for collision-aware
   * positioning. Higher values keep the floating content further from
   * the edge when `flip` / `shift` runs.
   */
  collisionPadding: number;
}

const FALLBACK: ForDropdownMenuDefaults = {
  sideOffset: 4,
  collisionPadding: 8,
};

const { token, provideDefaults } = createDefaults<ForDropdownMenuDefaults>(
  'FOR_DROPDOWN_MENU_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved dropdown-menu defaults for the current scope. */
export const FOR_DROPDOWN_MENU_DEFAULTS = token;

/**
 * Configures forty-cdk dropdown-menu defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or
 * library defaults at the root).
 */
export function provideForDropdownMenuDefaults(
  defaults: Partial<ForDropdownMenuDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
