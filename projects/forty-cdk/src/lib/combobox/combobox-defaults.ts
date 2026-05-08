import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant comboboxes in the surrounding injector
 * scope. Configure with `provideForComboboxDefaults`. The shape is a stub
 * today — present so future per-scope tuning (offsets, debounce timings,
 * filter strategies) can land without churning the public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForComboboxDefaults {}

const FALLBACK: ForComboboxDefaults = {};

const { token, provideDefaults } = createDefaults<ForComboboxDefaults>(
  'FOR_COMBOBOX_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved combobox defaults for the current scope. */
export const FOR_COMBOBOX_DEFAULTS = token;

/**
 * Configures forty-cdk combobox defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForComboboxDefaults(
  defaults: Partial<ForComboboxDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
