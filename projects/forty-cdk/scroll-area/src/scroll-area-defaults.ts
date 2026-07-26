import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';
import { type ForScrollAreaTrackPress } from './scroll-area-context';

/**
 * Defaults inherited by descendant scroll areas in the surrounding injector
 * scope. Configure with `provideForScrollAreaDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForScrollAreaDefaults {
  /**
   * Milliseconds after the most recent scroll before the synthetic
   * scrollbars fade. Applies when `type` is `'scroll'` or `'hover'`.
   */
  scrollHideDelay: number;

  /**
   * What a primary-button press on bare scrollbar track does: page toward the
   * press (with auto-repeat while held), jump the thumb to the press point, or
   * nothing at all.
   */
  trackPress: ForScrollAreaTrackPress;

  /**
   * Milliseconds a held `trackPress="page"` gesture waits before the first
   * auto-repeat page step.
   */
  trackPressRepeatDelay: number;

  /**
   * Milliseconds between auto-repeat page steps of a held `trackPress="page"`
   * gesture, after `trackPressRepeatDelay` has elapsed.
   */
  trackPressRepeatInterval: number;
}

/**
 * Library fallback for scroll area defaults, read at the root injector when no
 * consumer has called `provideForScrollAreaDefaults`. Exported for the shared defaults
 * contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_SCROLL_AREA_FALLBACK_DEFAULTS: ForScrollAreaDefaults = {
  scrollHideDelay: 600,
  trackPress: 'page',
  trackPressRepeatDelay: 300,
  trackPressRepeatInterval: 50,
};

const { token, provideDefaults } = createDefaults<ForScrollAreaDefaults>(
  'FOR_SCROLL_AREA_DEFAULTS',
  FOR_SCROLL_AREA_FALLBACK_DEFAULTS,
);

/** Token holding the resolved scroll-area defaults for the current scope. */
export const FOR_SCROLL_AREA_DEFAULTS = token;

/**
 * Configures forty-cdk scroll-area defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForScrollAreaDefaults(
  defaults: Partial<ForScrollAreaDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
