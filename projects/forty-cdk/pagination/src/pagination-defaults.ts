import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant paginations in the surrounding injector
 * scope. Configure with `provideForPaginationDefaults` at the application root
 * or in any component's `providers`; partial overrides merge with the parent.
 */
export interface ForPaginationDefaults {
  /** Pages shown on each side of the current page before collapsing to an ellipsis. */
  siblingCount: number;
  /** Pages always shown at each end (first/last). */
  boundaryCount: number;
}

/**
 * Library fallback for pagination defaults, read at the root injector when no
 * consumer has called `provideForPaginationDefaults`. Exported for the shared
 * defaults-contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_PAGINATION_FALLBACK_DEFAULTS: ForPaginationDefaults = {
  siblingCount: 1,
  boundaryCount: 1,
};

const { token, provideDefaults } = createDefaults<ForPaginationDefaults>(
  'FOR_PAGINATION_DEFAULTS',
  FOR_PAGINATION_FALLBACK_DEFAULTS,
);

/** Token holding the resolved pagination defaults for the current scope. */
export const FOR_PAGINATION_DEFAULTS = token;

/**
 * Configures forty-cdk pagination defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library defaults
 * at the root).
 */
export function provideForPaginationDefaults(
  defaults: Partial<ForPaginationDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
