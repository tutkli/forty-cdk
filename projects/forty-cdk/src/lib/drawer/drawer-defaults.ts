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
