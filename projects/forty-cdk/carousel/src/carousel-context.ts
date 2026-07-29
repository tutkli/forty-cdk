import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  type ListNavigationAction,
  type WritingDirection,
  type RovingTabindex,
} from 'forty-cdk/core';

/** Alignment of the active slide within the viewport. */
export type CarouselAlign = 'start' | 'center' | 'end';

/**
 * Internal handle for a registered slide. Part of the registration protocol, so
 * it is never exported from `public-api.ts` — see {@link CarouselContext}.
 */
export interface ForCarouselSlideHandle {
  readonly host: HTMLElement;
}

/**
 * Internal handle for a registered indicator (dot). Part of the registration
 * protocol, so it is never exported from `public-api.ts` — see
 * {@link CarouselContext}.
 */
export interface ForCarouselIndicatorHandle {
  readonly host: HTMLElement;
  readonly disabled: Signal<boolean>;
}

/**
 * Internal handle for the registered viewport. Part of the registration
 * protocol, so it is never exported from `public-api.ts` — see
 * {@link CarouselContext}.
 */
export interface ForCarouselViewportHandle {
  readonly host: HTMLElement;
  readonly id: string;
}

/**
 * Coordination contract owned by `ForCarousel`. Slides and indicators
 * register with the root so index lookups, geometry computations, and
 * keyboard navigation are all driven from a single source of truth.
 */
export interface ForCarouselContext {
  readonly activeIndex: Signal<number>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly loop: Signal<boolean>;
  readonly align: Signal<CarouselAlign>;
  readonly slidesPerView: Signal<number>;
  readonly slideCount: Signal<number>;
  readonly roving: RovingTabindex;

  /** Whether auto-rotation is currently "on" (user intent). Drives the rotation control's label. */
  readonly playing: Signal<boolean>;
  /** Whether the carousel is actively auto-rotating right now (`playing && !paused`). Drives the viewport's `aria-live`. */
  readonly rotating: Signal<boolean>;

  canScrollPrev(): boolean;
  canScrollNext(): boolean;
  scrollPrev(): void;
  scrollNext(): void;
  scrollTo(index: number): void;
  navigate(currentIndicator: HTMLElement, action: ListNavigationAction): void;

  /** Toggle auto-rotation on/off (the explicit, sticky user choice). Called by the rotation control. */
  toggleAutoplay(): void;

  viewportId(): string | null;

  indexOfSlide(host: HTMLElement): number;
  indexOfIndicator(host: HTMLElement): number;

  /** Resolve the positional slide `aria-label` (`"N of M"` by default). `position` is 1-based. */
  slideLabel(position: number): string;
  /** Resolve the indicator `aria-label` (`"Go to slide N"` by default). `position` is 1-based. */
  indicatorLabel(position: number): string;

  isCurrent(index: number): boolean;
  isInView(index: number): boolean;
  isFirstEnabledIndicator(el: HTMLElement): boolean;
  hasCurrentIndicator(): boolean;
}

/** DI token providing the carousel context to descendant pieces. */
export const FOR_CAROUSEL_CONTEXT = new InjectionToken<ForCarouselContext>('FOR_CAROUSEL_CONTEXT');

/**
 * The carousel's internal coordination surface: everything
 * {@link ForCarouselContext} publishes plus the slide / indicator / viewport
 * registration protocol the index lookups, geometry observer and roving
 * tabindex are driven from.
 *
 * Never exported from `public-api.ts`. `[forCarousel]` provides it alongside
 * {@link FOR_CAROUSEL_CONTEXT} on the same object, so a consumer who injects the
 * public token gets the read surface while the pieces get the wiring protocol.
 */
export interface CarouselContext extends ForCarouselContext {
  registerSlide(handle: ForCarouselSlideHandle): void;
  unregisterSlide(handle: ForCarouselSlideHandle): void;
  registerIndicator(handle: ForCarouselIndicatorHandle): void;
  unregisterIndicator(handle: ForCarouselIndicatorHandle): void;
  registerViewport(handle: ForCarouselViewportHandle): void;
  unregisterViewport(handle: ForCarouselViewportHandle): void;
}

/** DI token carrying the internal {@link CarouselContext}. Provided by `[forCarousel]`. */
export const CAROUSEL_CONTEXT = new InjectionToken<CarouselContext>('CAROUSEL_CONTEXT');

export function injectCarouselContext(piece: string): CarouselContext {
  const ctx = inject(CAROUSEL_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/carousel] ${piece} must be used inside a [forCarousel] element.`);
  }
  return ctx;
}
