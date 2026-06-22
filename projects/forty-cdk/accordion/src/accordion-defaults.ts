import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant accordions in the surrounding injector
 * scope. Configure with `provideForAccordionDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForAccordionDefaults {}

const FALLBACK: ForAccordionDefaults = {};

const { token, provideDefaults } = createDefaults<ForAccordionDefaults>(
  'FOR_ACCORDION_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved accordion defaults for the current scope. */
export const FOR_ACCORDION_DEFAULTS = token;

/**
 * Configures forty-cdk accordion defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForAccordionDefaults(
  defaults: Partial<ForAccordionDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
