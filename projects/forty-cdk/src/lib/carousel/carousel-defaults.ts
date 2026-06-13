import { type Provider } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';
import { type CarouselAlign } from './carousel-context';

/**
 * Defaults inherited by descendant carousels in the surrounding injector scope.
 * Configure with `provideForCarouselDefaults` either at the application root
 * or in any component's `providers` array; partial overrides merge with
 * the parent scope.
 */
export interface ForCarouselDefaults {
  /**
   * Whether index wrap-around is enabled. When `true`, `next` past the last
   * slide wraps to index 0 and `prev` before index 0 wraps to the last slide.
   */
  loop: boolean;
  /**
   * Alignment of the active slide within the viewport. `'start'` (default):
   * the active slide's leading edge aligns with the viewport's leading edge.
   * `'center'` / `'end'` offset accordingly.
   */
  align: CarouselAlign;
  /**
   * Number of slides visible simultaneously in the viewport. Slide width is
   * set to `100% / slidesPerView` by the consumer's CSS.
   */
  slidesPerView: number;
  /** Whether the carousel auto-rotates on mount (when not under reduced-motion). Default `false`. */
  autoplay: boolean;
  /** Milliseconds between automatic slide advances. Default `5000`. */
  autoplayInterval: number;
}

/**
 * Library fallback for carousel defaults, read at the root injector when no
 * consumer has called `provideForCarouselDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_CAROUSEL_FALLBACK_DEFAULTS: ForCarouselDefaults = {
  loop: false,
  align: 'start',
  slidesPerView: 1,
  autoplay: false,
  autoplayInterval: 5000,
};

const { token, provideDefaults } = createDefaults<ForCarouselDefaults>(
  'FOR_CAROUSEL_DEFAULTS',
  FOR_CAROUSEL_FALLBACK_DEFAULTS,
);

/** Token holding the resolved carousel defaults for the current scope. */
export const FOR_CAROUSEL_DEFAULTS = token;

/**
 * Configures forty-cdk carousel defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForCarouselDefaults(
  defaults: Partial<ForCarouselDefaults> = {},
): Provider[] {
  return provideDefaults(defaults);
}
