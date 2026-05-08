import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant context menus in the surrounding
 * injector scope. Configure with `provideForContextMenuDefaults` either
 * at the application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForContextMenuDefaults {
  /**
   * Distance (px) between the virtual anchor (pointer position) and the
   * floating content along the resolved `side` axis. Mirrors Radix's
   * `sideOffset`. Defaults to `0` since context menus open at the cursor.
   */
  sideOffset: number;
  /**
   * Padding (px) added to the viewport edges for collision-aware
   * positioning. Higher values keep the floating content further from
   * the edge when `flip` / `shift` runs.
   */
  collisionPadding: number;
}

const FALLBACK: ForContextMenuDefaults = {
  sideOffset: 0,
  collisionPadding: 8,
};

const { token, provideDefaults } = createDefaults<ForContextMenuDefaults>(
  'FOR_CONTEXT_MENU_DEFAULTS',
  FALLBACK,
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
