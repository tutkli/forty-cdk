import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant breadcrumb trails in the surrounding
 * injector scope. Configure with `provideForBreadcrumbsDefaults` either at the
 * application root or in any component's `providers` array; partial overrides
 * merge with the parent scope.
 */
export interface ForBreadcrumbsDefaults {
  /**
   * Accessible name for the breadcrumb `navigation` landmark, for trails that
   * don't set `[ariaLabel]` locally. Localize it here to translate every
   * breadcrumb landmark in the scope.
   */
  label: string;
}

/**
 * Library fallback for breadcrumbs defaults, read at the root injector when no
 * consumer has called `provideForBreadcrumbsDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_BREADCRUMBS_FALLBACK_DEFAULTS: ForBreadcrumbsDefaults = {
  label: 'Breadcrumb',
};

const { token, provideDefaults } = createDefaults<ForBreadcrumbsDefaults>(
  'FOR_BREADCRUMBS_DEFAULTS',
  FOR_BREADCRUMBS_FALLBACK_DEFAULTS,
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
