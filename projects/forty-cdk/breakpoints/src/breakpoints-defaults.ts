import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * A breakpoint map: each named breakpoint paired with its `min-width`
 * threshold in CSS pixels. Names are arbitrary — `injectBreakpoints` derives
 * its query methods (`up`, `down`, `between`, `only`) from whatever keys this
 * map declares, sorted ascending by threshold.
 */
export type BreakpointMap = Record<string, number>;

/**
 * The default breakpoint map, mirroring Tailwind CSS's `sm`–`2xl` scale. Used
 * as the library fallback when no `provideForBreakpointsDefaults` is in scope,
 * and the source of the typed breakpoint names when the consumer has not
 * augmented {@link BreakpointRegistry}.
 */
export const forBreakpointsTailwind = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const satisfies BreakpointMap;

/** The breakpoint names from the default Tailwind scale. */
export type TailwindBreakpointName = keyof typeof forBreakpointsTailwind;

/** Resolved shape stored against {@link FOR_BREAKPOINTS_DEFAULTS}. */
export interface ForBreakpointsDefaults {
  /** The active breakpoint map for the current injector scope. */
  breakpoints: BreakpointMap;
}

/**
 * Library fallback for breakpoints defaults, read at the root injector when no
 * consumer has called `provideForBreakpointsDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_BREAKPOINTS_FALLBACK_DEFAULTS: ForBreakpointsDefaults = {
  breakpoints: forBreakpointsTailwind,
};

const { token, provideDefaults } = createDefaults<ForBreakpointsDefaults>(
  'FOR_BREAKPOINTS_DEFAULTS',
  FOR_BREAKPOINTS_FALLBACK_DEFAULTS,
);

/**
 * Token holding the resolved breakpoint map for the current injector scope.
 * The library always provides a fully-populated value (the Tailwind fallback
 * at the root, or the map from the nearest `provideForBreakpointsDefaults`).
 */
export const FOR_BREAKPOINTS_DEFAULTS = token;

/**
 * Configures the breakpoint map for this injector scope so `injectBreakpoints`
 * can be called with no arguments. Provide it once in your application config:
 *
 * ```ts
 * providers: [
 *   provideForBreakpointsDefaults({ mobile: 0, tablet: 640, laptop: 1024, desktop: 1280 }),
 * ]
 * ```
 *
 * Providing it again on a component injector replaces the map for that subtree
 * only (the nearest scope wins; the map is replaced wholesale, never merged
 * key-by-key). Omit it entirely to use {@link forBreakpointsTailwind}.
 */
export function provideForBreakpointsDefaults(breakpoints: BreakpointMap): Provider[] {
  return provideDefaults({ breakpoints });
}
