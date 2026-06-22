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
 * Internal — not re-exported from `public-api.ts`.
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
 * Convenience wrapper around {@link injectMediaQuery} for the
 * `prefers-reduced-motion: reduce` query — the standard hook for users who
 * have asked their OS to suppress animations. Returns a `Signal<boolean>`
 * that flips reactively if the preference changes mid-session.
 *
 * Used by primitives whose default behaviour involves motion that may be
 * hostile to vestibular sensitivity (drag gestures, large transforms,
 * parallax). Consumers should treat a `true` result as a hard signal to
 * skip the animated path entirely, not just to shorten the duration.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export function injectPrefersReducedMotion(): Signal<boolean> {
  return injectMediaQuery('(prefers-reduced-motion: reduce)');
}
