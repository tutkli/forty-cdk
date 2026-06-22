import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';

/**
 * A breakpoint map: each named breakpoint paired with its `min-width`
 * threshold in CSS pixels. Names are arbitrary — `injectBreakpoints` derives
 * its query methods (`up`, `down`, `between`, `only`) from whatever keys this
 * map declares, sorted ascending by threshold.
 */
export type BreakpointMap = Record<string, number>;

/**
 * The default breakpoint map, mirroring Tailwind CSS's `sm`–`2xl` scale. Used
 * as the library fallback when no `provideForBreakpoints` is in scope, and the
 * source of the typed breakpoint names when the consumer has not augmented
 * {@link BreakpointRegistry}.
 */
export const breakpointsTailwind = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const satisfies BreakpointMap;

/** The breakpoint names from the default Tailwind scale. */
export type TailwindBreakpointName = keyof typeof breakpointsTailwind;

/** Resolved shape stored against {@link FOR_BREAKPOINTS}. */
export interface ForBreakpointsDefaults {
  /** The active breakpoint map for the current injector scope. */
  breakpoints: BreakpointMap;
}

const FALLBACK: ForBreakpointsDefaults = {
  breakpoints: breakpointsTailwind,
};

const { token, provideDefaults } = createDefaults<ForBreakpointsDefaults>(
  'FOR_BREAKPOINTS',
  FALLBACK,
);

/**
 * Token holding the resolved breakpoint map for the current injector scope.
 * The library always provides a fully-populated value (the Tailwind fallback
 * at the root, or the map from the nearest `provideForBreakpoints`).
 */
export const FOR_BREAKPOINTS = token;

/**
 * Configures the breakpoint map for this injector scope so `injectBreakpoints`
 * can be called with no arguments. Provide it once in your application config:
 *
 * ```ts
 * providers: [
 *   provideForBreakpoints({ mobile: 0, tablet: 640, laptop: 1024, desktop: 1280 }),
 * ]
 * ```
 *
 * Providing it again on a component injector replaces the map for that subtree
 * only (the nearest scope wins; the map is replaced wholesale, never merged
 * key-by-key). Omit it entirely to use {@link breakpointsTailwind}.
 */
export function provideForBreakpoints(breakpoints: BreakpointMap): Provider[] {
  return provideDefaults({ breakpoints });
}
