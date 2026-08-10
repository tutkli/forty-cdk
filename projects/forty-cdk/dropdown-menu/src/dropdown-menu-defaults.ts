import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';
import {
  type AnchoredPositioningSeedDefaults,
  type FloatingAlign,
  type FloatingFallbackAxisSideDirection,
  type FloatingSide,
} from 'forty-cdk/core-overlay';

/**
 * Defaults inherited by descendant dropdown menus in the surrounding
 * injector scope. Configure with `provideForDropdownMenuDefaults` either
 * at the application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForDropdownMenuDefaults extends AnchoredPositioningSeedDefaults {
  /**
   * Side the menu is anchored to for dropdowns that don't override `side`
   * locally. Library fallback `'bottom'`.
   */
  side: FloatingSide;
  /**
   * Alignment along the chosen `side` for dropdowns that don't override
   * `align` locally. Library fallback `'start'`.
   */
  align: FloatingAlign;
  /**
   * Distance (px) between the dropdown trigger and the floating content
   * along the resolved `side` axis.
   */
  sideOffset: number;
  /**
   * Padding (px) added to the viewport edges for collision-aware
   * positioning. Higher values keep the floating content further from
   * the edge when `flip` / `shift` runs.
   */
  collisionPadding: number;
  /**
   * Direction `flip` falls back to on the perpendicular axis when both sides
   * of the preferred axis overflow. `'none'` (default) keeps only the opposite
   * same-axis placement; `'start'` / `'end'` let a menu clipped on a narrow
   * viewport drop to a perpendicular side. Only consulted when
   * `avoidCollisions` is on.
   */
  fallbackAxisSideDirection: FloatingFallbackAxisSideDirection;
}

/**
 * Library fallback for dropdown menu defaults, read at the root injector when no
 * consumer has called `provideForDropdownMenuDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_DROPDOWN_MENU_FALLBACK_DEFAULTS: ForDropdownMenuDefaults = {
  side: 'bottom',
  align: 'start',
  sideOffset: 4,
  collisionPadding: 8,
  fallbackAxisSideDirection: 'none',
};

const { token, provideDefaults } = createDefaults<ForDropdownMenuDefaults>(
  'FOR_DROPDOWN_MENU_DEFAULTS',
  FOR_DROPDOWN_MENU_FALLBACK_DEFAULTS,
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
