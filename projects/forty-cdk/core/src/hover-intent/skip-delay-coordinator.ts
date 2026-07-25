import { DestroyRef, inject } from '@angular/core';

import type { HoverIntentCoordinator } from './hover-intent';
import { createSkipDelayWindow } from './skip-delay-window';

/**
 * Resolved cadence the {@link SkipDelayCoordinator} needs from its primitive's
 * defaults scope. Tooltip and Hover-card resolve these from their respective
 * `ForTooltipDefaults` / `ForHoverCardDefaults` tokens and hand them down.
 */
export interface SkipDelayCoordinatorDefaults {
  /** Resolved default open delay (ms) for primitives in this scope. */
  openDelay: number;
  /** Resolved default close delay (ms) for primitives in this scope. */
  closeDelay: number;
  /** Resolved skip-delay window (ms) for primitives in this scope. */
  skipDelayDuration: number;
}

/**
 * Per-injector-scope skip-delay coordinator shared by Tooltip and Hover-card.
 *
 * Wraps the shared `createSkipDelayWindow` timer core and adds the two things
 * only an injector-scoped coordinator needs: the resolved cadence its
 * primitives read when arming open / close timers, and a `DestroyRef` hook
 * that closes the window with the scope. Subclassed once per primitive so each
 * keeps its own DI token (and therefore its own independent skip-delay scope);
 * `[forNavigationMenu]` reuses the same timer core directly, per instance,
 * because its window is not shared across an injector scope.
 *
 * Satisfies {@link HoverIntentCoordinator} so the shared hover-intent
 * scheduler consumes it directly.
 */
export abstract class SkipDelayCoordinator implements HoverIntentCoordinator {
  /** Resolved default open delay (ms) for primitives in this scope. */
  readonly openDelay: number;

  /** Resolved default close delay (ms) for primitives in this scope. */
  readonly closeDelay: number;

  /** Resolved skip-delay window (ms) for primitives in this scope. */
  readonly skipDelayDuration: number;

  readonly #window = createSkipDelayWindow(() => this.skipDelayDuration);

  /** True while a peer in this scope just closed and the next open is instant. */
  readonly skipDelay = this.#window.active;

  constructor(defaults: SkipDelayCoordinatorDefaults) {
    this.openDelay = defaults.openDelay;
    this.closeDelay = defaults.closeDelay;
    this.skipDelayDuration = defaults.skipDelayDuration;
    inject(DestroyRef).onDestroy(() => this.cancelSkipDelay());
  }

  /** Opens the skip-delay window. Called by primitives when they finish closing. */
  startSkipDelay(): void {
    this.#window.start();
  }

  /** Cancels any pending skip-delay window. */
  cancelSkipDelay(): void {
    this.#window.cancel();
  }
}
