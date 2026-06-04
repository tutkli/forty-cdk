import type { WritableSignal } from '@angular/core';

/**
 * Per-injector-scope coordinator the hover-intent scheduler consults to decide
 * whether the open delay should be skipped, and to open the skip-delay window
 * when a primitive finishes closing. Both `TooltipCoordinator` and
 * `HoverCardCoordinator` satisfy this contract structurally.
 */
export interface HoverIntentCoordinator {
  /** True while a peer in this scope just closed and the next open is instant. */
  skipDelay(): boolean;
  /** Opens the skip-delay window. Called by the scheduler when it closes. */
  startSkipDelay(): void;
}

/**
 * Inputs for {@link createHoverIntent}. Delays are passed as accessor
 * functions so the scheduler reads resolved values (per-instance override or
 * scope default) at the moment a timer is armed.
 */
export interface HoverIntentOptions {
  /** Writable open-state signal the scheduler flips. */
  open: WritableSignal<boolean>;
  /** Whether all hover / focus interaction is currently ignored. */
  isDisabled: () => boolean;
  /** Resolved open delay (ms) to use when arming an open timer. */
  openDelay: () => number;
  /** Resolved close delay (ms) to use when arming a close timer. */
  closeDelay: () => number;
  /** Skip-delay coordinator shared by peers in the same scope. */
  coordinator: HoverIntentCoordinator;
}

/**
 * Hover-intent scheduler handle returned by {@link createHoverIntent}.
 */
export interface HoverIntentScheduler {
  /** Schedule the open after the resolved open delay (instant when delay is 0 or skipped). */
  scheduleOpen(): void;
  /** Schedule the close after the resolved close delay; `immediate` bypasses the delay. */
  scheduleClose(immediate: boolean): void;
  /** Cancel any pending open / close timer without changing state. */
  cancelPending(): void;
}

/**
 * Shared hover-intent scheduler for Tooltip and Hover-card.
 *
 * Both primitives carry an identical open / close timer with skip-delay
 * coordination and `Math.max(0, …)` guards; this framework-free factory holds
 * the single pending timer and the open / close logic, parameterized by the
 * resolved open / close delays plus a {@link HoverIntentCoordinator}. The
 * directive constructs it once (after its `open` signal exists) and delegates
 * its public scheduling methods to the returned handle. Internal — not
 * re-exported from `public-api.ts`.
 */
export function createHoverIntent(options: HoverIntentOptions): HoverIntentScheduler {
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelPending(): void {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function close(): void {
    options.open.set(false);
    options.coordinator.startSkipDelay();
  }

  function scheduleOpen(): void {
    if (options.isDisabled()) {
      return;
    }
    cancelPending();
    if (options.open()) {
      return;
    }
    const base = options.coordinator.skipDelay() ? 0 : options.openDelay();
    const delay = Math.max(0, base);
    if (delay === 0) {
      options.open.set(true);
      return;
    }
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      options.open.set(true);
    }, delay);
  }

  function scheduleClose(immediate: boolean): void {
    cancelPending();
    if (!options.open()) {
      return;
    }
    if (immediate) {
      close();
      return;
    }
    const delay = Math.max(0, options.closeDelay());
    if (delay === 0) {
      close();
      return;
    }
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      close();
    }, delay);
  }

  return { scheduleOpen, scheduleClose, cancelPending };
}
