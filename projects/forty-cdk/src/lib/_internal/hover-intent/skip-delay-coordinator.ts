import { DestroyRef, inject, signal } from '@angular/core';

import type { HoverIntentCoordinator } from './hover-intent';

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
 * Holds the single skip-delay flag and the timer that closes its window, plus
 * the resolved cadence its primitives read when arming open / close timers.
 * Both primitives previously hand-rolled byte-identical copies of this state
 * machine; this is the single class, subclassed once per primitive so each
 * keeps its own DI token (and therefore its own independent skip-delay scope).
 *
 * Satisfies {@link HoverIntentCoordinator} so the shared hover-intent
 * scheduler consumes it directly. Internal — not re-exported from
 * `public-api.ts`.
 */
export abstract class SkipDelayCoordinator implements HoverIntentCoordinator {
  readonly #skipDelay = signal(false);
  #timer: ReturnType<typeof setTimeout> | null = null;

  /** Resolved default open delay (ms) for primitives in this scope. */
  readonly openDelay: number;

  /** Resolved default close delay (ms) for primitives in this scope. */
  readonly closeDelay: number;

  /** Resolved skip-delay window (ms) for primitives in this scope. */
  readonly skipDelayDuration: number;

  /** True while a peer in this scope just closed and the next open is instant. */
  readonly skipDelay = this.#skipDelay.asReadonly();

  constructor(defaults: SkipDelayCoordinatorDefaults) {
    this.openDelay = defaults.openDelay;
    this.closeDelay = defaults.closeDelay;
    this.skipDelayDuration = defaults.skipDelayDuration;
    inject(DestroyRef).onDestroy(() => this.cancelSkipDelay());
  }

  /** Opens the skip-delay window. Called by primitives when they finish closing. */
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

  /** Cancels any pending skip-delay window. */
  cancelSkipDelay(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#skipDelay.set(false);
  }
}
