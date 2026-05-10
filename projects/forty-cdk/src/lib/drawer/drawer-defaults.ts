import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';
import { type ForDrawerSide } from './drawer-context';

/**
 * Defaults inherited by descendant drawers in the surrounding injector
 * scope. Configure with `provideForDrawerDefaults`. Keys map 1:1 to the
 * directive inputs of the same name; the directive picks
 * `consumerInput ?? defaults[key] ?? hardcoded fallback` per key.
 */
export interface ForDrawerDefaults {
  /** Default `'bottom'`. */
  side?: ForDrawerSide;
  /** Default `true`. Modal locks scroll, traps focus, applies `aria-modal`. */
  modal?: boolean;
  /** Default `true`. Whether dismiss interactions (Escape, backdrop, swipe) close. */
  dismissible?: boolean;
  /** Default `true`. Pointer drag gesture toward the anchored edge dismisses. */
  swipeToDismiss?: boolean;
  /**
   * Default `0.25`. Fraction of the drawer's dimension along the dismissal
   * axis past which a release dismisses instead of snapping back. Vaul
   * semantics (see `_internal/swipe-dismiss/resolveSnapTarget`).
   */
  closeThreshold?: number;
  /** Default `'first'`. Where to send focus on mount. */
  initialFocus?: 'first' | 'container';
  /** Default `true`. Restore focus to the previously focused element on close. */
  returnFocus?: boolean;
  /**
   * Default `false`. When `true` the swipe gesture only arms on the
   * registered `[forDrawerHandle]` element instead of the whole surface.
   */
  handleOnly?: boolean;
  /**
   * Default `false`. When `true`, an open drawer asks
   * `[forDrawerWrapper]` to scale + translate behind it (Vaul-style
   * "shouldScaleBackground"). Suppressed under
   * `prefers-reduced-motion: reduce`.
   */
  scaleBackground?: boolean;
  /**
   * Default `true`. When `scaleBackground` is active, paints the body
   * with `scaleBackgroundColor` so the sliver of viewport between the
   * scaled wrapper and the screen edge does not show through.
   */
  setBackgroundColorOnScale?: boolean;
  /** Default `0.95`. Scale factor applied to the wrapper. */
  scaleAmount?: number;
  /**
   * Default `14`. Vertical translation (in CSS pixels) added to
   * `env(safe-area-inset-top)` while the wrapper is scaled.
   */
  scaleTranslateYpx?: number;
  /** Default `8`. Border radius applied to the wrapper while scaled. */
  scaleBorderRadiusPx?: number;
  /**
   * Default `'black'`. Body background colour applied while
   * `setBackgroundColorOnScale` is active.
   */
  scaleBackgroundColor?: string;
}

const FALLBACK: ForDrawerDefaults = {
  side: 'bottom',
  modal: true,
  dismissible: true,
  swipeToDismiss: true,
  closeThreshold: 0.25,
  initialFocus: 'first',
  returnFocus: true,
  handleOnly: false,
  scaleBackground: false,
  setBackgroundColorOnScale: true,
  scaleAmount: 0.95,
  scaleTranslateYpx: 14,
  scaleBorderRadiusPx: 8,
  scaleBackgroundColor: 'black',
};

const { token, provideDefaults } = createDefaults<ForDrawerDefaults>(
  'FOR_DRAWER_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved drawer defaults for the current scope. */
export const FOR_DRAWER_DEFAULTS = token;

/**
 * Configures forty-cdk drawer defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForDrawerDefaults(defaults: Partial<ForDrawerDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
