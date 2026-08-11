import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';
import {
  type AnchoredPositioningSeedDefaults,
  type FloatingAlign,
  type FloatingSide,
} from 'forty-cdk/core-overlay';

/**
 * Defaults inherited by descendant popovers in the surrounding injector
 * scope. Configure with `provideForPopoverDefaults` at the app root or in
 * any component's `providers`; partial overrides merge with the parent scope.
 */
export interface ForPopoverDefaults extends AnchoredPositioningSeedDefaults {
  /**
   * Side the popover is anchored to for popovers that don't override `side`
   * locally. Library fallback `'bottom'`.
   */
  side: FloatingSide;
  /**
   * Alignment along the chosen `side` for popovers that don't override
   * `align` locally. Library fallback `'center'`.
   */
  align: FloatingAlign;
  /**
   * Gap (px) between trigger and content along the main axis for popovers
   * that don't override `sideOffset` locally.
   * Library fallback `8`.
   */
  sideOffset: number;
  /**
   * Padding (px) applied uniformly to the `flip`, `shift`, and `size`
   * middlewares for popovers that don't override `collisionPadding` locally.
   * Library fallback `8`.
   */
  collisionPadding: number;
  /**
   * Padding (px) keeping the `[forPopoverArrow]` element that far from the
   * edges of the content, for popovers that don't override `arrowPadding`
   * locally. Only consulted when an arrow is registered — floating-ui installs
   * the `arrow` middleware only then. Library fallback `0`.
   */
  arrowPadding: number;
}

/**
 * Library fallback for popover defaults, read at the root injector when no
 * consumer has called `provideForPopoverDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_POPOVER_FALLBACK_DEFAULTS: ForPopoverDefaults = {
  side: 'bottom',
  align: 'center',
  sideOffset: 8,
  collisionPadding: 8,
  arrowPadding: 0,
};

const { token, provideDefaults } = createDefaults<ForPopoverDefaults>(
  'FOR_POPOVER_DEFAULTS',
  FOR_POPOVER_FALLBACK_DEFAULTS,
);

/** Token holding the resolved popover defaults for the current scope. */
export const FOR_POPOVER_DEFAULTS = token;

/**
 * Configures forty-cdk popover defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForPopoverDefaults(defaults: Partial<ForPopoverDefaults> = {}): Provider[] {
  return provideDefaults(defaults);
}
