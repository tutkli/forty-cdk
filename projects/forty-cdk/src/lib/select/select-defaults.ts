import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant selects in the surrounding injector
 * scope. Configure with `provideForSelectDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForSelectDefaults {
  /**
   * Distance (px) between the select trigger and the floating content
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

const FALLBACK: ForSelectDefaults = {
  sideOffset: 4,
  collisionPadding: 8,
};

const { token, provideDefaults } = createDefaults<ForSelectDefaults>(
  'FOR_SELECT_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved select defaults for the current scope. */
export const FOR_SELECT_DEFAULTS = token;

/**
 * Configures forty-cdk select defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForSelectDefaults(defaults: Partial<ForSelectDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
