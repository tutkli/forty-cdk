import { inject, Injectable, type Provider } from '@angular/core';

import {
  createDefaults,
  type FloatingAlign,
  type FloatingSide,
  SkipDelayCoordinator,
} from 'forty-cdk/core';

/**
 * Defaults inherited by descendant hover-cards in the surrounding injector
 * scope. Configure with `provideForHoverCardDefaults` at the app root or in
 * any component's `providers`.
 */
export interface ForHoverCardDefaults {
  /** Open delay (ms) for cards that don't override `openDelay` locally. */
  openDelay: number;
  /** Close delay (ms) for cards that don't override `closeDelay` locally. */
  closeDelay: number;
  /**
   * Window (ms) after a peer card in this scope closes during which the
   * next open is instant — useful for adjacent profile cards in a list,
   * so cursor movement doesn't feel sluggish.
   */
  skipDelayDuration: number;
  /**
   * Side the card is anchored to for cards that don't override `side`
   * locally. Library fallback `'top'`.
   */
  side: FloatingSide;
  /**
   * Alignment along the chosen `side` for cards that don't override `align`
   * locally. Library fallback `'center'`.
   */
  align: FloatingAlign;
  /**
   * Gap (px) between trigger and card along the main axis for cards that
   * don't override `sideOffset` locally.
   * Library fallback `8`.
   */
  sideOffset: number;
  /**
   * Padding (px) applied uniformly to the `flip`, `shift`, and `size`
   * middlewares for cards that don't override `collisionPadding` locally.
   * Library fallback `8`.
   */
  collisionPadding: number;
}

/**
 * Library fallback for hover-card defaults, read at the root injector when no
 * consumer has called `provideForHoverCardDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_HOVER_CARD_FALLBACK_DEFAULTS: ForHoverCardDefaults = {
  openDelay: 700,
  closeDelay: 300,
  skipDelayDuration: 300,
  side: 'top',
  align: 'center',
  sideOffset: 8,
  collisionPadding: 8,
};

const { token, provideDefaults } = createDefaults<ForHoverCardDefaults>(
  'FOR_HOVER_CARD_DEFAULTS',
  FOR_HOVER_CARD_FALLBACK_DEFAULTS,
);

/** Token holding the resolved hover-card defaults for the current scope. */
export const FOR_HOVER_CARD_DEFAULTS = token;

/**
 * Per-injector-scope coordinator: thin subclass of the shared
 * `SkipDelayCoordinator` bound to this primitive's own DI token. Each
 * `provideForHoverCardDefaults` call re-provides it so the corresponding
 * subtree gets its own skip-delay window. Independent from
 * `TooltipCoordinator` — tooltips and hover-cards have different cadences and
 * separate scopes.
 */
@Injectable({ providedIn: 'root' })
export class HoverCardCoordinator extends SkipDelayCoordinator {
  constructor() {
    super(inject(FOR_HOVER_CARD_DEFAULTS));
  }
}

/**
 * Configures forty-cdk hover-card defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or
 * library defaults at the root). Each call establishes a new coordinator
 * scope.
 */
export function provideForHoverCardDefaults(
  defaults: Partial<ForHoverCardDefaults> = {},
): Provider[] {
  return [...provideDefaults(defaults), HoverCardCoordinator];
}
