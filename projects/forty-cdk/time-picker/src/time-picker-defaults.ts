import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';
import {
  type AnchoredPositioningSeedDefaults,
  type FloatingAlign,
  type FloatingSide,
} from 'forty-cdk/core-overlay';

/**
 * Defaults inherited by descendant time pickers in the surrounding injector
 * scope. Configure with `provideForTimePickerDefaults` either at the
 * application root or in any component's `providers` array; partial overrides
 * merge with the parent scope.
 */
export interface ForTimePickerDefaults extends AnchoredPositioningSeedDefaults {
  /**
   * Side the listbox is anchored to for time pickers that don't override
   * `side` locally. Library fallback `'bottom'`.
   */
  side: FloatingSide;
  /**
   * Alignment along the chosen `side` for time pickers that don't override
   * `align` locally. Library fallback `'start'`.
   */
  align: FloatingAlign;
  /**
   * Distance (px) between the time picker trigger and the floating content
   * along the resolved `side` axis.
   */
  sideOffset: number;
  /**
   * Padding (px) added to the viewport edges for collision-aware positioning.
   * Higher values keep the floating content further from the edge when
   * `flip` / `shift` runs.
   */
  collisionPadding: number;
}

/**
 * Library fallback for time picker defaults, read at the root injector when no
 * consumer has called `provideForTimePickerDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_TIME_PICKER_FALLBACK_DEFAULTS: ForTimePickerDefaults = {
  side: 'bottom',
  align: 'start',
  sideOffset: 4,
  collisionPadding: 8,
};

const { token, provideDefaults } = createDefaults<ForTimePickerDefaults>(
  'FOR_TIME_PICKER_DEFAULTS',
  FOR_TIME_PICKER_FALLBACK_DEFAULTS,
);

/** Token holding the resolved time picker defaults for the current scope. */
export const FOR_TIME_PICKER_DEFAULTS = token;

/**
 * Configures forty-cdk time picker defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library defaults
 * at the root).
 */
export function provideForTimePickerDefaults(
  defaults: Partial<ForTimePickerDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
