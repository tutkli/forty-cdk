import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';
import { type TabsActivationMode } from './tabs-context';

/**
 * Defaults inherited by descendant tabs in the surrounding injector scope.
 * Configure with `provideForTabsDefaults` either at the application root
 * or in any component's `providers` array; partial overrides merge with
 * the parent scope.
 */
export interface ForTabsDefaults {
  /**
   * `'automatic'` (default): arrow navigation moves focus AND selects the
   * new tab. Use when panel content is cheap to render. `'manual'`: arrow
   * navigation only moves focus; the user must press Space / Enter to
   * activate. Use when panel content is expensive.
   */
  activationMode: TabsActivationMode;
  /**
   * Whether arrow navigation wraps around past the first / last enabled
   * trigger. Matches the WAI-ARIA Tabs APG default.
   */
  loop: boolean;
}

/**
 * Library fallback for tabs defaults, read at the root injector when no
 * consumer has called `provideForTabsDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_TABS_FALLBACK_DEFAULTS: ForTabsDefaults = {
  activationMode: 'automatic',
  loop: true,
};

const { token, provideDefaults } = createDefaults<ForTabsDefaults>(
  'FOR_TABS_DEFAULTS',
  FOR_TABS_FALLBACK_DEFAULTS,
);

/** Token holding the resolved tabs defaults for the current scope. */
export const FOR_TABS_DEFAULTS = token;

/**
 * Configures forty-cdk tabs defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForTabsDefaults(defaults: Partial<ForTabsDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
