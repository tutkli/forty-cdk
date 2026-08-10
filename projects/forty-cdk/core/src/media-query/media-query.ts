import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, DestroyRef, PLATFORM_ID, inject, signal, type Signal } from '@angular/core';

/**
 * Reflects the result of `MediaQueryList.matches` for `query` as a signal,
 * staying in sync via `addEventListener('change')`. The listener is removed
 * on the calling injection context's `DestroyRef.onDestroy`.
 *
 * Must be called from an injection context. SSR-safe: when `PLATFORM_ID`
 * is not the browser the helper returns a frozen `signal(false)` and never
 * touches `matchMedia`. Browsers without `matchMedia` (extreme legacy) fall
 * into the same SSR path.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export function injectMediaQuery(query: string): Signal<boolean> {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const doc = inject(DOCUMENT);
  const win = doc.defaultView;
  if (!isBrowser || !win || typeof win.matchMedia !== 'function') {
    return signal(false).asReadonly();
  }

  const mql = win.matchMedia(query);
  const matches = signal(mql.matches);
  const listener = (event: MediaQueryListEvent): void => {
    matches.set(event.matches);
  };
  mql.addEventListener('change', listener);
  inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', listener));

  return matches.asReadonly();
}

/**
 * Reflects the `prefers-reduced-motion: reduce` media query as a signal — the
 * standard hook for users who have asked their OS to suppress animations. The
 * signal flips reactively if the preference changes mid-session.
 *
 * Because forty-cdk ships no styles, every animation is the consumer's, and so
 * is honouring this preference. Treat a `true` result as a hard signal to skip
 * the animated path entirely, not just to shorten the duration. The primitives
 * whose own default behaviour involves motion (drag gestures, large transforms,
 * parallax) read the same signal.
 *
 * Must be called from an injection context. SSR-safe: on the server the
 * returned signal is a frozen `false`, so the server render takes the animated
 * path's markup and the preference is applied once the client observes it.
 *
 * @example
 * ```ts
 * private readonly reducedMotion = injectPrefersReducedMotion();
 *
 * protected readonly transition = computed(() =>
 *   this.reducedMotion() ? 'none' : 'transform 200ms ease-out',
 * );
 * ```
 *
 * @returns A `Signal<boolean>` that is `true` while the user asks for reduced
 * motion.
 */
export function injectPrefersReducedMotion(): Signal<boolean> {
  return injectMediaQuery('(prefers-reduced-motion: reduce)');
}
