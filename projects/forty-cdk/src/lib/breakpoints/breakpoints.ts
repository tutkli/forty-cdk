import { Injector, computed, inject, runInInjectionContext, type Signal } from '@angular/core';

import { injectMediaQuery } from '../_internal/media-query/media-query';
import { FOR_BREAKPOINTS, type TailwindBreakpointName } from './breakpoints-defaults';

/**
 * Extension point for typing custom breakpoint names. Augment it via module
 * declaration merging so `injectBreakpoints` autocompletes your own names
 * instead of the default Tailwind scale:
 *
 * ```ts
 * import type { appBreakpoints } from './breakpoints';
 *
 * declare module 'forty-cdk' {
 *   interface BreakpointRegistry extends Record<keyof typeof appBreakpoints, true> {}
 * }
 * ```
 *
 * When left empty (no augmentation), {@link BreakpointName} falls back to the
 * keys of {@link breakpointsTailwind}.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BreakpointRegistry {}

/**
 * The set of valid breakpoint names. Resolves to the augmented
 * {@link BreakpointRegistry} keys when present, otherwise the Tailwind scale
 * (`'sm' | 'md' | 'lg' | 'xl' | '2xl'`).
 */
export type BreakpointName = [keyof BreakpointRegistry] extends [never]
  ? TailwindBreakpointName
  : keyof BreakpointRegistry & string;

/** Reactive handle returned by {@link injectBreakpoints}. */
export interface ForBreakpoints<K extends string = BreakpointName> {
  /**
   * Matches the named breakpoint and wider — `(min-width: <threshold>px)`.
   * @param name A breakpoint declared in the active map.
   */
  up(name: K): Signal<boolean>;
  /**
   * Matches narrower than the named breakpoint —
   * `(max-width: <threshold - 0.02>px)`. The 0.02px back-off keeps `up(name)`
   * and `down(name)` from both matching at the exact threshold.
   * @param name A breakpoint declared in the active map.
   */
  down(name: K): Signal<boolean>;
  /**
   * Matches from `min` (inclusive) up to but not including `max`.
   * @param min Lower breakpoint, inclusive.
   * @param max Upper breakpoint, exclusive.
   */
  between(min: K, max: K): Signal<boolean>;
  /**
   * Matches only the named breakpoint's own band — from its threshold up to
   * but not including the next-larger breakpoint (open-ended for the largest).
   * @param name A breakpoint declared in the active map.
   */
  only(name: K): Signal<boolean>;
  /**
   * The largest breakpoint whose `min-width` currently matches, or `null` when
   * the viewport is narrower than the smallest breakpoint (and on the server).
   */
  readonly active: Signal<K | null>;
  /**
   * Escape hatch for an arbitrary media query string (orientation, pointer,
   * `prefers-color-scheme`, …) that the named helpers don't cover.
   * @param query Any valid media query.
   */
  matches(query: string): Signal<boolean>;
}

/**
 * A signal-first, zoneless, SSR-safe viewport breakpoint observer. Reads the
 * breakpoint map from the ambient {@link FOR_BREAKPOINTS} token (configured
 * with `provideForBreakpoints`, or the Tailwind fallback), so call sites never
 * repeat the breakpoint set:
 *
 * ```ts
 * private bp = injectBreakpoints();
 * protected isDesktop = this.bp.up('desktop');
 * protected active = this.bp.active;
 * ```
 *
 * Each query method returns a `Signal<boolean>` backed by a cached
 * `MediaQueryList`. The returned handle captures the calling injection
 * context, so its methods can be invoked lazily from `computed()` or a
 * template — not only during construction. Listeners are torn down with the
 * injector. On the server (or where `matchMedia` is unavailable) every signal
 * reads `false` and `active` reads `null`.
 *
 * Must be called from an injection context.
 *
 * @returns A {@link ForBreakpoints} handle of reactive query methods.
 */
export function injectBreakpoints(): ForBreakpoints {
  const injector = inject(Injector);
  const map = inject(FOR_BREAKPOINTS).breakpoints;
  const names = Object.keys(map).sort((a, b) => map[a] - map[b]);
  const cache = new Map<string, Signal<boolean>>();

  const observe = (query: string): Signal<boolean> => {
    let result = cache.get(query);
    if (result === undefined) {
      result = runInInjectionContext(injector, () => injectMediaQuery(query));
      cache.set(query, result);
    }
    return result;
  };

  const thresholdOf = (name: string): number => {
    const value = map[name];
    if (value === undefined) {
      throw new Error(
        `[forty-cdk/breakpoints] Unknown breakpoint "${name}". Defined breakpoints: ${
          names.join(', ') || '(none)'
        }.`,
      );
    }
    return value;
  };

  const up = (name: string): Signal<boolean> => observe(`(min-width: ${thresholdOf(name)}px)`);

  const down = (name: string): Signal<boolean> =>
    observe(`(max-width: ${thresholdOf(name) - 0.02}px)`);

  const between = (min: string, max: string): Signal<boolean> =>
    observe(`(min-width: ${thresholdOf(min)}px) and (max-width: ${thresholdOf(max) - 0.02}px)`);

  const only = (name: string): Signal<boolean> => {
    const lower = thresholdOf(name);
    const index = names.indexOf(name);
    const next = index < names.length - 1 ? thresholdOf(names[index + 1]) : null;
    return next === null
      ? observe(`(min-width: ${lower}px)`)
      : observe(`(min-width: ${lower}px) and (max-width: ${next - 0.02}px)`);
  };

  const active = computed<BreakpointName | null>(() => {
    let current: string | null = null;
    for (const name of names) {
      if (observe(`(min-width: ${map[name]}px)`)()) {
        current = name;
      }
    }
    return current as BreakpointName | null;
  });

  return { up, down, between, only, active, matches: (query) => observe(query) };
}
