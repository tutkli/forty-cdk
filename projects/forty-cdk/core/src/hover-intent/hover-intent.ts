import { effect, type Signal, untracked, type WritableSignal } from '@angular/core';

/**
 * A single self-clearing debounce timer: the `Math.max(0, delay)` clamp, the
 * `delay === 0` synchronous fast-path, and the lone pending
 * `setTimeout` / `clearTimeout` pair.
 *
 * The hover-driven menus (`[forMenuSub]`, `[forMenubar]`, `[forNavigationMenu]`)
 * each hand-rolled this exact timer arming/clearing under their own divergent
 * open/close policy (chain keep-alive, hover-after-open, per-value cancel
 * guards, skip-delay). This factory owns only the timing mechanics so those
 * policies stay at the call site — the caller arms with `schedule(delay)`,
 * which clears any in-flight timer first, runs `run` immediately when the
 * clamped delay is `0`, else fires it once after the delay.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export interface DebouncedAction {
  /**
   * Arm the action after `delay` ms (clamped to `>= 0`). Clears any pending
   * timer first; a clamped delay of `0` runs `run` synchronously.
   */
  schedule(delay: number): void;
  /** Cancel a pending action without running it. Safe with no pending timer. */
  cancel(): void;
  /** `true` while an action is armed but not yet fired. */
  isPending(): boolean;
}

/**
 * Builds a {@link DebouncedAction} around `run`. Framework-free.
 */
export function createDebouncedAction(run: () => void): DebouncedAction {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule(delay: number): void {
    cancel();
    const clamped = Math.max(0, delay);
    if (clamped === 0) {
      run();
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      run();
    }, clamped);
  }

  return {
    schedule,
    cancel,
    isPending: () => timer !== null,
  };
}

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
 * its public scheduling methods to the returned handle.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
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
    cancelPending();
    if (options.isDisabled()) {
      return;
    }
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
      if (options.isDisabled()) {
        return;
      }
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

/**
 * Inputs for {@link forceCloseWhenDisabled}.
 */
export interface ForceCloseWhenDisabledOptions {
  /** Open-state signal that is force-closed when `disabled` flips to true. */
  open: WritableSignal<boolean>;
  /** Whether all hover / focus interaction is currently ignored. */
  disabled: Signal<boolean>;
  /** Imperative cleanup run before the force-close (cancel any pending timers). */
  onForceClose: () => void;
}

/**
 * The single audited place that force-closes a hover-driven overlay when its
 * `disabled` input flips to `true` while open.
 *
 * Tooltip and Hover-card each carried a byte-identical copy of this reaction;
 * it is the **one sanctioned exception** to the project's "never propagate
 * state inside `effect()`" rule, so it must live in exactly one place rather
 * than two carve-outs to audit. The hover scheduler already early-returns on
 * `disabled()`, so hover / focus can't open a disabled overlay; this isolated
 * reaction only covers the remaining path — an open overlay being disabled out
 * from under itself.
 *
 * The `open` read is `untracked` so the effect never re-runs as a function of
 * `open` (no read+write cycle on the same signal); it reacts to `disabled`
 * alone. It integrates the disabled gate with the public `model()` instead of
 * wrapping the model in a parallel signal.
 *
 * Must be called from an injection context (registers an `effect`). Internal
 * core tier — no semver guarantee.
 */
export function forceCloseWhenDisabled(options: ForceCloseWhenDisabledOptions): void {
  // @sanctioned-effect(untracked-read): the `open` read is untracked, so the
  // effect reacts to `disabled` alone and never cycles on the signal it writes.
  effect(() => {
    if (options.disabled() && untracked(options.open)) {
      options.onForceClose();
      options.open.set(false);
    }
  });
}
