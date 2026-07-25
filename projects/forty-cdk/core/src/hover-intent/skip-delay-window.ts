import { signal, type Signal } from '@angular/core';

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
