import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant breadcrumbs in the surrounding injector
 * scope. Configure with `provideForBreadcrumbsDefaults`. The shape is a stub
 * today — present so future per-scope tuning can land without churning the
 * public surface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ForBreadcrumbsDefaults {}

const FALLBACK: ForBreadcrumbsDefaults = {};

const { token, provideDefaults } = createDefaults<ForBreadcrumbsDefaults>(
  'FOR_BREADCRUMBS_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved breadcrumbs defaults for the current scope. */
export const FOR_BREADCRUMBS_DEFAULTS = token;

/**
 * Configures forty-cdk breadcrumbs defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForBreadcrumbsDefaults(
  defaults: Partial<ForBreadcrumbsDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
