import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant avatars in the surrounding injector
 * scope. Configure with `provideForAvatarDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForAvatarDefaults {
  /**
   * Milliseconds to defer the fallback for fast loads, avoiding a brief
   * "initials → image" flicker. Set to `0` to show immediately during
   * `idle` / `loading`, or to e.g. `500` to skip rendering during quick
   * cached loads. `error` always shows the fallback immediately.
   */
  fallbackDelayMs: number;
}

/**
 * Library fallback for avatar defaults, read at the root injector when no
 * consumer has called `provideForAvatarDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_AVATAR_FALLBACK_DEFAULTS: ForAvatarDefaults = {
  fallbackDelayMs: 0,
};

const { token, provideDefaults } = createDefaults<ForAvatarDefaults>(
  'FOR_AVATAR_DEFAULTS',
  FOR_AVATAR_FALLBACK_DEFAULTS,
);

/** Token holding the resolved avatar defaults for the current scope. */
export const FOR_AVATAR_DEFAULTS = token;

/**
 * Configures forty-cdk avatar defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForAvatarDefaults(defaults: Partial<ForAvatarDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
