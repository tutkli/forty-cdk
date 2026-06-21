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
 * clamped delay is `0`, else fires it once after the delay. Internal — not
 * re-exported from `public-api.ts`.
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
