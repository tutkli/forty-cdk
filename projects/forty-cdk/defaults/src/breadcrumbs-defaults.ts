import { InjectionToken, type Provider } from '@angular/core';

import type { LocalizableText } from 'forty-cdk/core';

import { provideDefaults } from './defaults';

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
  label: LocalizableText;
}

/**
 * Library fallback for breadcrumbs defaults, read at the root injector when no
 * consumer has called `provideForBreadcrumbsDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_BREADCRUMBS_FALLBACK_DEFAULTS: ForBreadcrumbsDefaults = {
  label: 'Breadcrumb',
};

/** Token holding the resolved breadcrumbs defaults for the current scope. */
export const FOR_BREADCRUMBS_DEFAULTS = new InjectionToken<ForBreadcrumbsDefaults>(
  'FOR_BREADCRUMBS_DEFAULTS',
  {
    providedIn: 'root',
    factory: () => FOR_BREADCRUMBS_FALLBACK_DEFAULTS,
  },
);

/**
 * Configures forty-cdk breadcrumbs defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 *
 * Pass a function instead of an object to build the overrides where
 * `inject()` is available; it runs once per injector that resolves the
 * defaults.
 */
export function provideForBreadcrumbsDefaults(
  defaults: Partial<ForBreadcrumbsDefaults> | (() => Partial<ForBreadcrumbsDefaults>) = {},
): Provider[] {
  return provideDefaults(FOR_BREADCRUMBS_DEFAULTS, FOR_BREADCRUMBS_FALLBACK_DEFAULTS, defaults);
}
