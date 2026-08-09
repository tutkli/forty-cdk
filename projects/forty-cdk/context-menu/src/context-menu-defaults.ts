import { type Provider } from '@angular/core';

import {
  type AnchoredPositioningSeedDefaults,
  createDefaults,
  type FloatingAlign,
  type FloatingFallbackAxisSideDirection,
  type FloatingSide,
} from 'forty-cdk/core';

/**
 * Defaults inherited by descendant context menus in the surrounding
 * injector scope. Configure with `provideForContextMenuDefaults` either
 * at the application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForContextMenuDefaults extends AnchoredPositioningSeedDefaults {
  /**
   * Side the menu is anchored to, relative to the virtual anchor at the
   * pointer, for context menus that don't override `side` locally. Library
   * fallback `'bottom'`.
   */
  side: FloatingSide;
  /**
   * Alignment along the chosen `side` for context menus that don't override
   * `align` locally. Library fallback `'start'`.
   */
  align: FloatingAlign;
  /**
   * Distance (px) between the virtual anchor (pointer position) and the
   * floating content along the resolved `side` axis. Defaults to `0`
   * since context menus open at the cursor.
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
 * Library fallback for context menu defaults, read at the root injector when no
 * consumer has called `provideForContextMenuDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_CONTEXT_MENU_FALLBACK_DEFAULTS: ForContextMenuDefaults = {
  side: 'bottom',
  align: 'start',
  sideOffset: 0,
  collisionPadding: 8,
  fallbackAxisSideDirection: 'none',
};

const { token, provideDefaults } = createDefaults<ForContextMenuDefaults>(
  'FOR_CONTEXT_MENU_DEFAULTS',
  FOR_CONTEXT_MENU_FALLBACK_DEFAULTS,
);

/** Token holding the resolved context-menu defaults for the current scope. */
export const FOR_CONTEXT_MENU_DEFAULTS = token;

/**
 * Configures forty-cdk context-menu defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or
 * library defaults at the root).
 */
export function provideForContextMenuDefaults(
  defaults: Partial<ForContextMenuDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
