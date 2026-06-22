import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant progress bars in the surrounding injector
 * scope. Configure with `provideForProgressDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForProgressDefaults {
  /**
   * Whether to announce `Complete` (or the label) once via `aria-live` on
   * the loading→complete transition. Opt-in — useful on flows where the
   * user explicitly waits for completion (uploads, submissions).
   */
  announceCompletion: boolean;
}

/**
 * Library fallback for progress defaults, read at the root injector when no
 * consumer has called `provideForProgressDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_PROGRESS_FALLBACK_DEFAULTS: ForProgressDefaults = {
  announceCompletion: false,
};

const { token, provideDefaults } = createDefaults<ForProgressDefaults>(
  'FOR_PROGRESS_DEFAULTS',
  FOR_PROGRESS_FALLBACK_DEFAULTS,
);

/** Token holding the resolved progress defaults for the current scope. */
export const FOR_PROGRESS_DEFAULTS = token;

/**
 * Configures forty-cdk progress defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForProgressDefaults(
  defaults: Partial<ForProgressDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
