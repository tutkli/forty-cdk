import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant disclosures in the surrounding injector
 * scope. Configure with `provideForDisclosureDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForDisclosureDefaults {}

const FALLBACK: ForDisclosureDefaults = {};

const { token, provideDefaults } = createDefaults<ForDisclosureDefaults>(
  'FOR_DISCLOSURE_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved disclosure defaults for the current scope. */
export const FOR_DISCLOSURE_DEFAULTS = token;

/**
 * Configures forty-cdk disclosure defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForDisclosureDefaults(
  defaults: Partial<ForDisclosureDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
