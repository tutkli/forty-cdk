import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
  type Signal,
} from '@angular/core';

/**
 * Application-scoped `matchMedia` observer: one `MediaQueryList` and one
 * `change` listener per distinct query string, shared by every caller and
 * removed when the application is destroyed.
 *
 * SSR-safe: off the browser, where `matchMedia` is unavailable, or once the
 * application is destroyed, an unobserved query reads a frozen `false` and
 * `matchMedia` is never touched.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
@Injectable({ providedIn: 'root' })
export class MediaQueryRegistry {
  readonly #win = inject(DOCUMENT).defaultView;
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #entries = new Map<string, Signal<boolean>>();
  readonly #teardowns: Array<() => void> = [];
  readonly #unmatched = signal(false).asReadonly();
  #destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.#destroyed = true;
      for (const teardown of this.#teardowns) {
        teardown();
      }
      this.#teardowns.length = 0;
    });
  }

  /**
   * Reflects `MediaQueryList.matches` for `query` as a signal. Repeated calls
   * with the same query return the same signal.
   */
  observe(query: string): Signal<boolean> {
    const cached = this.#entries.get(query);
    if (cached !== undefined) {
      return cached;
    }
    const win = this.#win;
    if (this.#destroyed || !this.#isBrowser || !win || typeof win.matchMedia !== 'function') {
      return this.#unmatched;
    }

    const mql = win.matchMedia(query);
    const matches = signal(mql.matches);
    const listener = (event: MediaQueryListEvent): void => {
      matches.set(event.matches);
    };
    mql.addEventListener('change', listener);
    this.#teardowns.push(() => mql.removeEventListener('change', listener));

    const result = matches.asReadonly();
    this.#entries.set(query, result);
    return result;
  }
}

/**
 * Reflects the result of `MediaQueryList.matches` for `query` as a signal,
 * staying in sync via `addEventListener('change')`. Every call reading the
 * same query shares one `MediaQueryList` and one listener, which live as long
 * as the application rather than the calling injection context.
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
  return inject(MediaQueryRegistry).observe(query);
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
