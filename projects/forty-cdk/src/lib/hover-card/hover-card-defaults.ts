import { DestroyRef, inject, Injectable, type Provider, signal } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * Defaults inherited by descendant hover-cards in the surrounding injector
 * scope. Configure with `provideForHoverCardDefaults` at the app root or in
 * any component's `providers`.
 */
export interface HoverCardDefaults {
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
}

const FALLBACK: HoverCardDefaults = {
  openDelay: 700,
  closeDelay: 300,
  skipDelayDuration: 300,
};

const { token, provideDefaults } = createDefaults<HoverCardDefaults>(
  'FOR_HOVER_CARD_DEFAULTS',
  FALLBACK,
);

/** Token holding the resolved hover-card defaults for the current scope. */
export const FOR_HOVER_CARD_DEFAULTS = token;

/**
 * Per-injector-scope coordinator: holds the resolved defaults and the
 * skip-delay flag. Each `provideForHoverCardDefaults` call re-provides this
 * class so the corresponding subtree gets its own coordinator (and its
 * own skip-delay window). Independent from `TooltipCoordinator` —
 * tooltips and hover-cards have different cadences.
 */
@Injectable({ providedIn: 'root' })
export class HoverCardCoordinator {
  readonly #defaults = inject(FOR_HOVER_CARD_DEFAULTS);
  readonly #skipDelay = signal(false);
  #timer: ReturnType<typeof setTimeout> | null = null;

  readonly openDelay = this.#defaults.openDelay;
  readonly closeDelay = this.#defaults.closeDelay;
  readonly skipDelayDuration = this.#defaults.skipDelayDuration;

  readonly skipDelay = this.#skipDelay.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelSkipDelay());
  }

  startSkipDelay(): void {
    this.cancelSkipDelay();
    this.#skipDelay.set(true);
    this.#timer = setTimeout(
      () => {
        this.#skipDelay.set(false);
        this.#timer = null;
      },
      Math.max(0, this.skipDelayDuration),
    );
  }

  cancelSkipDelay(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#skipDelay.set(false);
  }
}

/**
 * Configures forty-cdk hover-card defaults for this injector scope.
 * Partial overrides inherit unspecified keys from the parent scope (or
 * library defaults at the root). Each call establishes a new coordinator
 * scope.
 */
export function provideForHoverCardDefaults(defaults: Partial<HoverCardDefaults>): Provider[] {
  return [...provideDefaults(defaults), HoverCardCoordinator];
}
