import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Defaults inherited by descendant listboxes in the surrounding injector
 * scope. Configure with `provideForListboxDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForListboxDefaults {
  /**
   * Single-mode only: when `true`, arrow navigation also selects the
   * focused option. APG calls this optional and recommends caution —
   * leave `false` unless the UX truly benefits from selection following
   * focus.
   */
  selectionFollowsFocus: boolean;
}

/**
 * Library fallback for listbox defaults, read at the root injector when no
 * consumer has called `provideForListboxDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_LISTBOX_FALLBACK_DEFAULTS: ForListboxDefaults = {
  selectionFollowsFocus: false,
};

const { token, provideDefaults } = createDefaults<ForListboxDefaults>(
  'FOR_LISTBOX_DEFAULTS',
  FOR_LISTBOX_FALLBACK_DEFAULTS,
);

/** Token holding the resolved listbox defaults for the current scope. */
export const FOR_LISTBOX_DEFAULTS = token;

/**
 * Configures forty-cdk listbox defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForListboxDefaults(defaults: Partial<ForListboxDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
