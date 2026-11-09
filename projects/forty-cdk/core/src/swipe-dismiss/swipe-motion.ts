import { computed, type Signal } from '@angular/core';

import { injectPrefersReducedMotion } from '../media-query/media-query';

/**
 * The reduced-motion policy shared by every surface built on
 * `attachSwipeDismiss`. Under `prefers-reduced-motion: reduce` the gesture
 * stays armed, commits on release (snap, dismiss, advance) and fires its swipe
 * outputs, but the surface publishes no movement that follows the finger: every
 * value routed through {@link SwipeMotion.follow} reads `0`.
 */
export interface SwipeMotion {
  /** `false` while the user asks for reduced motion. */
  readonly enabled: Signal<boolean>;
  /**
   * The value a surface publishes for a live, finger-following quantity (a
   * displacement in px, a progress fraction): `value` while motion is enabled,
   * `0` under reduced motion. Reads {@link enabled}, so a `computed` or host
   * binding calling it follows a runtime change of the preference.
   */
  readonly follow: (value: number) => number;
}

/**
 * Resolve the {@link SwipeMotion} policy for a swipe surface. Must be called
 * from an injection context. SSR-safe: the server reads motion as enabled.
 */
export function injectSwipeMotion(): SwipeMotion {
  const reducedMotion = injectPrefersReducedMotion();
  const enabled = computed(() => !reducedMotion());
  return { enabled, follow: (value) => (enabled() ? value : 0) };
}
