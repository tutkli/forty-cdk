import { type Provider } from '@angular/core';

import {
  type AnchoredPositioningSeedDefaults,
  createDefaults,
  type FloatingAlign,
  type FloatingSide,
} from 'forty-cdk/core';

/**
 * Defaults inherited by descendant selects in the surrounding injector
 * scope. Configure with `provideForSelectDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForSelectDefaults extends AnchoredPositioningSeedDefaults {
  /**
   * Side the listbox is anchored to for selects that don't override `side`
   * locally. Ignored under `position="item-aligned"`. Library fallback
   * `'bottom'`.
   */
  side: FloatingSide;
  /**
   * Alignment along the chosen `side` for selects that don't override `align`
   * locally. Ignored under `position="item-aligned"`. Library fallback
   * `'start'`.
   */
  align: FloatingAlign;
  /**
   * Distance (px) between the select trigger and the floating content
   * along the resolved `side` axis.
   */
  sideOffset: number;
  /**
   * Padding (px) added to the viewport edges for collision-aware
   * positioning. Higher values keep the floating content further from
   * the edge when `flip` / `shift` runs.
   */
  collisionPadding: number;
}

/**
 * Library fallback for select defaults, read at the root injector when no
 * consumer has called `provideForSelectDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_SELECT_FALLBACK_DEFAULTS: ForSelectDefaults = {
  side: 'bottom',
  align: 'start',
  sideOffset: 4,
  collisionPadding: 8,
};

const { token, provideDefaults } = createDefaults<ForSelectDefaults>(
  'FOR_SELECT_DEFAULTS',
  FOR_SELECT_FALLBACK_DEFAULTS,
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
