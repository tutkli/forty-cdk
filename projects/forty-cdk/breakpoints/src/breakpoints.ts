import { computed, inject, type Signal } from '@angular/core';

import { MediaQueryRegistry, fortyError } from 'forty-cdk/core';
import { FOR_BREAKPOINTS_DEFAULTS, type TailwindBreakpointName } from 'forty-cdk/defaults';

/**
 * Extension point for typing custom breakpoint names. Augment it via module
 * declaration merging so `injectBreakpoints` autocompletes your own names
 * instead of the default Tailwind scale:
 *
 * ```ts
 * import type { appBreakpoints } from './breakpoints';
 *
 * declare module 'forty-cdk/breakpoints' {
 *   interface BreakpointRegistry extends Record<keyof typeof appBreakpoints, true> {}
 * }
 * ```
 *
 * When left empty (no augmentation), {@link BreakpointName} falls back to the
 * keys of {@link forBreakpointsTailwind}.
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
 * breakpoint map from the ambient {@link FOR_BREAKPOINTS_DEFAULTS} token
 * (configured with `provideForBreakpointsDefaults`, or the Tailwind fallback),
 * so call sites never repeat the breakpoint set:
 *
 * ```ts
 * private bp = injectBreakpoints();
 * protected isDesktop = this.bp.up('desktop');
 * protected active = this.bp.active;
 * ```
 *
 * Each query method returns a `Signal<boolean>` backed by a `MediaQueryList`
 * shared across the application: any number of calls reading the same query
 * open it once, and its listener lives as long as the application. The
 * methods need no injection context, so they can be invoked lazily from
 * `computed()` or a template — not only during construction. `active`'s
 * per-breakpoint queries are materialized eagerly at call time, so reading
 * `active` never attaches a listener from inside a reactive computation. On
 * the server (or where `matchMedia` is unavailable) every signal reads
 * `false` and `active` reads `null`.
 *
 * Must be called from an injection context.
 *
 * @returns A {@link ForBreakpoints} handle of reactive query methods.
 */
export function injectBreakpoints(): ForBreakpoints {
  const registry = inject(MediaQueryRegistry);
  const map = inject(FOR_BREAKPOINTS_DEFAULTS).breakpoints;
  const names = Object.keys(map).sort((a, b) => map[a]! - map[b]!);

  const observe = (query: string): Signal<boolean> => registry.observe(query);

  const thresholdOf = (name: string): number => {
    const value = map[name];
    if (value === undefined) {
      throw fortyError({
        code: 'FORCDK-BREAKPOINTS-001',
        message: `Unknown breakpoint "${name}".`,
        cause: `The active breakpoint map defines: ${names.join(', ') || '(none)'}.`,
        fix: 'Use one of the names above, or register yours with provideForBreakpointsDefaults().',
      });
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
    const next = index < names.length - 1 ? thresholdOf(names[index + 1]!) : null;
    return next === null
      ? observe(`(min-width: ${lower}px)`)
      : observe(`(min-width: ${lower}px) and (max-width: ${next - 0.02}px)`);
  };

  const activeCandidates = names.map((name) => ({
    name,
    matches: observe(`(min-width: ${map[name]}px)`),
  }));

  const active = computed<BreakpointName | null>(() => {
    let current: string | null = null;
    for (const candidate of activeCandidates) {
      if (candidate.matches()) {
        current = candidate.name;
      }
    }
    return current as BreakpointName | null;
  });

  return { up, down, between, only, active, matches: (query) => observe(query) };
}
