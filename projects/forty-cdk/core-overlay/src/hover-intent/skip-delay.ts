import { DestroyRef, inject, signal, type Signal } from '@angular/core';

import type { HoverIntentCoordinator } from './hover-intent';

/**
 * Skip-delay window handle returned by {@link createSkipDelayWindow}.
 */
export interface SkipDelayWindow {
  /** True while the window is open, meaning the next open should be instant. */
  readonly active: Signal<boolean>;
  /** Opens the window, replacing any window already pending. */
  start(): void;
  /** Closes the window immediately and drops any pending timer. */
  cancel(): void;
}

/**
 * Framework-free skip-delay window: the single `active` flag plus the one
 * `setTimeout` / `clearTimeout` pair that closes it after the resolved
 * duration (clamped to `>= 0`).
 *
 * `duration` is read as an accessor when the window is armed, so a caller
 * whose duration is a per-instance `input()` signal (`[forNavigationMenu]`)
 * and a caller whose duration is a value resolved once from its defaults
 * scope (the tooltip / hover-card skip-delay coordinator) share the same
 * mechanics. Owns no DI: the caller wires its own teardown, e.g.
 * `inject(DestroyRef).onDestroy(() => window.cancel())`.
 */
export function createSkipDelayWindow(duration: () => number): SkipDelayWindow {
  const active = signal(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    active.set(false);
  }

  function start(): void {
    cancel();
    active.set(true);
    timer = setTimeout(
      () => {
        timer = null;
        active.set(false);
      },
      Math.max(0, duration()),
    );
  }

  return { active: active.asReadonly(), start, cancel };
}

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
