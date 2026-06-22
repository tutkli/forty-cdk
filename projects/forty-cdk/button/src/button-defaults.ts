import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant buttons in the surrounding injector
 * scope. Configure with `provideForButtonDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForButtonDefaults {}

const FALLBACK: ForButtonDefaults = {};

const { token, provideDefaults } = createDefaults<ForButtonDefaults>(
  'FOR_BUTTON_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved button defaults for the current scope. */
export const FOR_BUTTON_DEFAULTS = token;

/**
 * Configures forty-cdk button defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForButtonDefaults(defaults: Partial<ForButtonDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
