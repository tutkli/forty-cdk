import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant popovers in the surrounding injector
 * scope. Configure with `provideForPopoverDefaults`. The shape is a stub
 * today — present so future per-scope tuning (default side / align,
 * collision padding) can land without churning the public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForPopoverDefaults {}

const FALLBACK: ForPopoverDefaults = {};

const { token, provideDefaults } = createDefaults<ForPopoverDefaults>(
  'FOR_POPOVER_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved popover defaults for the current scope. */
export const FOR_POPOVER_DEFAULTS = token;

/**
 * Configures forty-cdk popover defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForPopoverDefaults(defaults: Partial<ForPopoverDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
