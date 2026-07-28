import { effect, type Signal, untracked, type WritableSignal } from '@angular/core';

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
