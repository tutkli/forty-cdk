import { DestroyRef, inject, type Signal, signal } from '@angular/core';

import { isPageHidden, subscribeVisibilityPause } from '../visibility-pause/visibility-pause';

/**
 * Options for {@link injectPauseController}.
 */
export interface PauseControllerOptions {
  /**
   * When `true` (default), the controller auto-subscribes the shared
   * `visibility-pause` source: it applies the `'visibility'` reason while the
   * page is backgrounded (seeding from the current state on construction) and
   * releases it when the page becomes visible again. The reason key is always
   * the literal `'visibility'`, so the reason union `R` must include it — a
   * caller that leaves page-visibility tracking enabled (i.e. does not pass
   * `trackPageVisibility: false`) fails to compile unless `'visibility'` is
   * assignable to `R`. Pass `trackPageVisibility: false` to opt out, which also
   * exempts the caller from that constraint.
   */
  trackPageVisibility?: boolean;
  /**
   * Invoked synchronously on every `paused` transition (and only on a genuine
   * change), after the `paused` signal has been updated. Lets a consumer layer
   * imperative side effects on the edge — e.g. Toast captures the remaining
   * auto-dismiss time on pause and reschedules on resume — without putting its
   * timer on the reactive graph.
   */
  onChange?: (paused: boolean) => void;
}

/**
 * Multi-reason pause controller shared by Toast and Carousel.
 *
 * Holds the set of active pause reasons and a derived `paused` signal (`true`
 * while any reason is held). Several independent sources — pointer hover,
 * focus, page visibility — can each pause and resume independently; the work
 * stays paused until every reason is released. Toast and Carousel previously
 * hand-rolled byte-identical copies of the reason set plus `apply` / `release`
 * / `update` helpers, and the copies had already drifted (only Toast wired the
 * page-visibility source through it). Centralizing both restores parity.
 *
 * Must be called from an injection context (subscribes `visibility-pause` via
 * the injector-scoped source). Internal core tier — no semver guarantee.
 */
export interface PauseController<R extends string> {
  /** `true` while at least one pause reason is held. */
  readonly paused: Signal<boolean>;
  /** Hold `reason`. Idempotent — holding an already-held reason is a no-op. */
  apply(reason: R): void;
  /** Release `reason`. Idempotent — releasing a not-held reason is a no-op. */
  release(reason: R): void;
}

/**
 * Builds a {@link PauseController}. When `trackPageVisibility` is enabled the
 * `'visibility'` reason is wired to the shared `visibility-pause` source and
 * its subscription is torn down with the surrounding injector.
 *
 * The caller contract is compiler-checked: because page-visibility tracking
 * defaults on and always holds the literal `'visibility'` reason, a caller that
 * leaves it enabled must have `'visibility'` assignable to `R`. When it isn't,
 * the `options` argument becomes required and must be `{ trackPageVisibility:
 * false }`, so enabling the source without a matching reason union fails to
 * compile. Callers that pass `trackPageVisibility: false` are exempt (any `R`).
 */
export function injectPauseController<R extends string>(
  ...args: 'visibility' extends R
    ? [options?: PauseControllerOptions]
    : [options: PauseControllerOptions & { trackPageVisibility: false }]
): PauseController<R> {
  const options: PauseControllerOptions = args[0] ?? {};
  const reasons = new Set<R>();
  const paused = signal(false);

  function update(): void {
    const next = reasons.size > 0;
    if (next === paused()) {
      return;
    }
    paused.set(next);
    options.onChange?.(next);
  }

  function apply(reason: R): void {
    reasons.add(reason);
    update();
  }

  function release(reason: R): void {
    reasons.delete(reason);
    update();
  }

  if (options.trackPageVisibility ?? true) {
    const visibilityReason = 'visibility' as R;
    const unsubscribe = subscribeVisibilityPause((hidden) => {
      if (hidden) {
        apply(visibilityReason);
      } else {
        release(visibilityReason);
      }
    });
    inject(DestroyRef).onDestroy(unsubscribe);
    if (isPageHidden()) {
      apply(visibilityReason);
    }
  }

  return {
    paused: paused.asReadonly(),
    apply,
    release,
  };
}
