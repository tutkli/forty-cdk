import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  type ListNavigationAction,
  orphanContextError,
  type RovingTabindex,
  type WritingDirection,
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

  /** Whether auto-rotation is currently "on" (user intent). Drives the rotation control's label. */
  readonly playing: Signal<boolean>;
  /** Whether the carousel is actively auto-rotating right now (`playing && !paused`). Drives the viewport's `aria-live`. */
  readonly rotating: Signal<boolean>;

  canScrollPrev(): boolean;
  canScrollNext(): boolean;
  scrollPrev(): void;
  scrollNext(): void;
  scrollTo(index: number): void;

  /** Toggle auto-rotation on/off (the explicit, sticky user choice). Called by the rotation control. */
  toggleAutoplay(): void;

  isCurrent(index: number): boolean;
  isFirstEnabledIndicator(el: HTMLElement): boolean;
  hasCurrentIndicator(): boolean;
}

/**
 * The carousel's piece-coordination surface: the roving tracker the indicators
 * share, the DOM-order index lookups, the viewport id the rotation control
 * points `aria-controls` at, and the localizable positional labels.
 *
 * **Not** part of {@link ForCarouselContext} and never exported
 * from `public-api.ts` — a consumer drives the carousel through `scrollTo` /
 * `scrollNext`, never through the indicators' shared tab stop.
 */
export interface CarouselPieceContext {
  readonly roving: RovingTabindex;

  navigate(currentIndicator: HTMLElement, action: ListNavigationAction): void;

  viewportId(): string | null;

  indexOfSlide(host: HTMLElement): number;
  indexOfIndicator(host: HTMLElement): number;

  /** Resolve the positional slide `aria-label` (`"N of M"` by default). `position` is 1-based. */
  slideLabel(position: number): string;
  /** Resolve the indicator `aria-label` (`"Go to slide N"` by default). `position` is 1-based. */
  indicatorLabel(position: number): string;

  isInView(index: number): boolean;
}

/**
 * DI token providing the carousel context to descendant pieces.
 *
 * Publicly typed as the read surface {@link ForCarouselContext}, which is the whole of
 * what the token promises a consumer. The pieces read the same token at an internal type
 * that adds the slide / indicator / viewport registration protocol, so a wrapper
 * re-providing it must alias it to the root: `{ provide: FOR_CAROUSEL_CONTEXT,
 * useExisting: MyCarousel }`, where `MyCarousel` extends `ForCarousel`. A value that
 * merely satisfies the declared type resolves too, and is rejected in dev mode by the
 * first piece to reach the protocol.
 */
export const FOR_CAROUSEL_CONTEXT = new InjectionToken<ForCarouselContext>('FOR_CAROUSEL_CONTEXT');

/**
 * The carousel's internal coordination surface: everything
 * {@link ForCarouselContext} publishes plus the {@link CarouselPieceContext}
 * members and the slide / indicator / viewport registration protocol the index
 * lookups, geometry observer and roving tabindex are driven from.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_CAROUSEL_CONTEXT} at, so a consumer who injects that token gets the
 * read surface while the pieces get the wiring protocol. `ForCarousel` declares
 * the protocol members TS-`private`, which keeps them out of the emitted
 * `.d.ts` while `useExisting` still satisfies this contract at runtime.
 */
export interface CarouselContext extends ForCarouselContext, CarouselPieceContext {
  registerSlide(handle: ForCarouselSlideHandle): void;
  unregisterSlide(handle: ForCarouselSlideHandle): void;
  registerIndicator(handle: ForCarouselIndicatorHandle): void;
  unregisterIndicator(handle: ForCarouselIndicatorHandle): void;
  registerViewport(handle: ForCarouselViewportHandle): void;
  unregisterViewport(handle: ForCarouselViewportHandle): void;
}

export function injectCarouselContext(piece: string): CarouselContext {
  const ctx = inject(FOR_CAROUSEL_CONTEXT, { optional: true }) as CarouselContext | null;
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-CAROUSEL-001',
      piece,
      root: '[forCarousel]',
      token: 'FOR_CAROUSEL_CONTEXT',
    });
  }
  assertRootContext({
    entryPoint: 'carousel',
    token: 'FOR_CAROUSEL_CONTEXT',
    root: '[forCarousel]',
    piece,
    probe: () => ctx.registerSlide,
  });
  return ctx;
}
