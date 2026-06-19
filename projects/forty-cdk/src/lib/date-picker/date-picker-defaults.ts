import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant date pickers in the surrounding injector
 * scope. Configure with `provideForDatePickerDefaults` either at the
 * application root or in any component's `providers` array; partial overrides
 * merge with the parent scope.
 */
export interface ForDatePickerDefaults {
  /**
   * Distance (px) between the trigger and the floating surface along the
   * resolved `side` axis. Ignored in `modal`
   * mode (the dialog is centered, not anchored).
   */
  sideOffset: number;
  /**
   * Padding (px) added to the viewport edges for collision-aware positioning.
   * Higher values keep the surface further from the edge when `flip` / `shift`
   * runs.
   */
  collisionPadding: number;
}

/**
 * Library fallback for date-picker defaults, read at the root injector when no
 * consumer has called `provideForDatePickerDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_DATE_PICKER_FALLBACK_DEFAULTS: ForDatePickerDefaults = {
  sideOffset: 8,
  collisionPadding: 8,
};

const { token, provideDefaults } = createDefaults<ForDatePickerDefaults>(
  'FOR_DATE_PICKER_DEFAULTS',
  FOR_DATE_PICKER_FALLBACK_DEFAULTS,
);

/** Token holding the resolved date-picker defaults for the current scope. */
export const FOR_DATE_PICKER_DEFAULTS = token;

/**
 * Configures forty-cdk date-picker defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForDatePickerDefaults(
  defaults: Partial<ForDatePickerDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
