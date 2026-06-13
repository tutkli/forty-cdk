import { inject, InjectionToken, type Signal } from '@angular/core';

import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';

/** Alignment of the active slide within the viewport. */
export type CarouselAlign = 'start' | 'center' | 'end';

/** Internal handle for a registered slide. */
export interface ForCarouselSlideHandle {
  readonly host: HTMLElement;
}

/** Internal handle for a registered indicator (dot). */
export interface ForCarouselIndicatorHandle {
  readonly host: HTMLElement;
  readonly disabled: Signal<boolean>;
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

  canScrollPrev(): boolean;
  canScrollNext(): boolean;
  scrollPrev(): void;
  scrollNext(): void;
  scrollTo(index: number): void;
  navigate(currentIndicator: HTMLElement, action: ListNavigationAction): void;

  registerSlide(handle: ForCarouselSlideHandle): void;
  unregisterSlide(handle: ForCarouselSlideHandle): void;
  registerIndicator(handle: ForCarouselIndicatorHandle): void;
  unregisterIndicator(handle: ForCarouselIndicatorHandle): void;

  setViewport(el: HTMLElement, id: string): void;
  viewportId(): string | null;

  indexOfSlide(host: HTMLElement): number;
  indexOfIndicator(host: HTMLElement): number;
  isCurrent(index: number): boolean;
  isInView(index: number): boolean;
  isFirstEnabledIndicator(el: HTMLElement): boolean;
  hasCurrentIndicator(): boolean;
}

/** DI token providing the carousel context to descendant pieces. */
export const FOR_CAROUSEL_CONTEXT = new InjectionToken<ForCarouselContext>('FOR_CAROUSEL_CONTEXT');

export function injectCarouselContext(piece: string): ForCarouselContext {
  const ctx = inject(FOR_CAROUSEL_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/carousel] ${piece} must be used inside a [forCarousel] element.`);
  }
  return ctx;
}
