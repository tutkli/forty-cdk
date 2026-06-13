import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  signal,
} from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import { injectElementSize } from '../_internal/element-size/element-size';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { reconcileRovingActive } from '../_internal/roving-tabindex/reconcile-roving-active';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  type CarouselAlign,
  FOR_CAROUSEL_CONTEXT,
  type ForCarouselContext,
  type ForCarouselIndicatorHandle,
  type ForCarouselSlideHandle,
} from './carousel-context';
import { FOR_CAROUSEL_DEFAULTS } from './carousel-defaults';

/**
 * Root of the Carousel primitive. Owns the active index, slide collection,
 * indicator collection, roving tabindex tracker, and computed geometry CSS
 * variables. Provides the shared context to descendant pieces.
 *
 * Implements the [WAI-ARIA APG Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).
 *
 * With no `[forCarouselIndicators]` rendered this is a basic carousel driven
 * by prev/next buttons only. Adding an indicator group enables APG picker
 * semantics: roving tabindex, arrow/Home/End navigation with automatic
 * activation.
 */
@Directive({
  selector: '[forCarousel]',
  exportAs: 'forCarousel',
  host: {
    role: 'group',
    'aria-roledescription': 'carousel',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-align]': 'align()',
    '[attr.dir]': 'dir()',
    '[style.--for-carousel-offset]': 'offset()',
    '[style.--for-carousel-active-index]': 'activeIndex()',
    '[style.--for-carousel-slide-count]': 'slideCount()',
    '[style.--for-carousel-slides-per-view]': 'slidesPerView()',
    '[style.--for-carousel-viewport-width]': 'viewportWidth()',
    '[style.--for-carousel-viewport-height]': 'viewportHeight()',
  },
  providers: [{ provide: FOR_CAROUSEL_CONTEXT, useExisting: ForCarousel }],
})
export class ForCarousel implements ForCarouselContext {
  readonly #defaults = inject(FOR_CAROUSEL_DEFAULTS);

  /**
   * Two-way bindable. The zero-based index of the current (leading) slide.
   * The `model()` change emitter (`(activeIndexChange)`) fires only on internal
   * navigation (prev/next button clicks, indicator arrow-key or click), never
   * on consumer writes via `[(activeIndex)]`.
   */
  readonly activeIndex = model<number>(0);

  /** Scroll axis. `'horizontal'` (default) or `'vertical'`. */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Whether index wrap-around is enabled. When `true`, `next` past the last
   * slide wraps to index 0; `prev` before index 0 wraps to the last. Default
   * comes from `provideForCarouselDefaults` or the library fallback (`false`).
   */
  readonly loop = input(this.#defaults.loop, { transform: booleanAttribute });

  /**
   * Alignment of the active slide within the viewport. Affects the
   * `--for-carousel-offset` computation. Default from `provideForCarouselDefaults`
   * or `'start'`.
   */
  readonly align = input<CarouselAlign>(this.#defaults.align);

  /**
   * Number of slides simultaneously visible in the viewport. Slide width
   * should be set to `calc(100% / var(--for-carousel-slides-per-view))` in
   * the consumer's CSS. Default from `provideForCarouselDefaults` or `1`.
   */
  readonly slidesPerView = input(this.#defaults.slidesPerView, { transform: numberAttribute });

  /**
   * Accessible label for the carousel root (`role="group"`). Should describe
   * the carousel's purpose without using the word "carousel" (APG guidance).
   * When null (default), no `aria-label` is emitted; use `aria-labelledby`
   * instead when a visible heading labels the carousel.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and swaps
   * ArrowLeft / ArrowRight semantics on the indicator group in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /** Roving tabindex tracker for the indicator group. */
  readonly roving = new RovingTabindex();

  readonly #slides = new Collection<ForCarouselSlideHandle>();
  readonly #indicators = new Collection<ForCarouselIndicatorHandle>();

  readonly #viewportEl = signal<HTMLElement | null>(null);
  readonly #viewportId = signal<string | null>(null);
  readonly #viewportBox = injectElementSize(this.#viewportEl);

  /** Total number of registered slides. Reactive. */
  readonly slideCount = computed(() => this.#slides.items().length);

  readonly #firstEnabledIndicatorHost = computed(() => firstEnabledHost(this.#indicators.items()));

  /**
   * The `--for-carousel-offset` value to apply via `transform` on the track.
   * Pure arithmetic — no layout measurement — so it is safe in Vitest.
   */
  readonly offset = computed(() => {
    const perView = Math.max(1, this.slidesPerView());
    const slideSizePct = 100 / perView;
    const base = -(this.activeIndex() * slideSizePct);
    const align = this.align();
    const adjust =
      align === 'center' ? (100 - slideSizePct) / 2 : align === 'end' ? 100 - slideSizePct : 0;
    return `${base + adjust}%`;
  });

  /** The measured viewport width, or `null` before first measurement / on the server. */
  readonly viewportWidth = computed(() => {
    const box = this.#viewportBox();
    return box ? `${box.width}px` : null;
  });

  /** The measured viewport height, or `null` before first measurement / on the server. */
  readonly viewportHeight = computed(() => {
    const box = this.#viewportBox();
    return box ? `${box.height}px` : null;
  });

  constructor() {
    reconcileRovingActive(this.roving, this.#indicators.items);
  }

  /** Returns `true` when scrolling backward is possible given the current loop/index state. */
  canScrollPrev(): boolean {
    return moveIndex(this.activeIndex(), this.slideCount(), 'prev', { loop: this.loop() }) !== null;
  }

  /** Returns `true` when scrolling forward is possible given the current loop/index state. */
  canScrollNext(): boolean {
    return moveIndex(this.activeIndex(), this.slideCount(), 'next', { loop: this.loop() }) !== null;
  }

  /** Navigate to the previous slide. No-op at index 0 when not looping. */
  scrollPrev(): void {
    this.#move('prev');
  }

  /** Navigate to the next slide. No-op at the last index when not looping. */
  scrollNext(): void {
    this.#move('next');
  }

  /**
   * Navigate to the slide at `index`. Clamps to `[0, slideCount-1]` when not
   * looping; wraps modulo `slideCount` when looping.
   */
  scrollTo(index: number): void {
    const count = this.slideCount();
    if (count === 0) {
      return;
    }
    const target = this.loop()
      ? ((index % count) + count) % count
      : Math.max(0, Math.min(index, count - 1));
    this.activeIndex.set(target);
  }

  /**
   * Move focus from `currentIndicator` according to `action` and activate the
   * target slide (automatic activation). Used by `ForCarouselIndicator`'s
   * keydown handler.
   */
  navigate(currentIndicator: HTMLElement, action: ListNavigationAction): void {
    const indicators = this.#indicators.items();
    if (indicators.length === 0) {
      return;
    }
    const currentIndex = indicators.findIndex((i) => i.host === currentIndicator);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, indicators.length, action, {
      loop: this.loop(),
      isDisabled: (i) => indicators[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    indicators[next]!.host.focus();
    this.scrollTo(next);
  }

  registerSlide(handle: ForCarouselSlideHandle): void {
    this.#slides.register(handle);
  }

  unregisterSlide(handle: ForCarouselSlideHandle): void {
    this.#slides.unregister(handle);
  }

  registerIndicator(handle: ForCarouselIndicatorHandle): void {
    this.#indicators.register(handle);
  }

  unregisterIndicator(handle: ForCarouselIndicatorHandle): void {
    this.#indicators.unregister(handle);
    this.roving.unregister(handle.host);
  }

  /** Called by `ForCarouselViewport` at construction to wire the geometry observer. */
  setViewport(el: HTMLElement, id: string): void {
    this.#viewportEl.set(el);
    this.#viewportId.set(id);
  }

  /** The id of the registered viewport element, or `null` if none is mounted. */
  viewportId(): string | null {
    return this.#viewportId();
  }

  /** DOM-order index of the registered slide whose host equals `host`, or -1. */
  indexOfSlide(host: HTMLElement): number {
    return this.#slides.indexOfHost(host);
  }

  /** DOM-order index of the registered indicator whose host equals `host`, or -1. */
  indexOfIndicator(host: HTMLElement): number {
    return this.#indicators.indexOfHost(host);
  }

  /** Returns `true` when `index` is the current active slide index. */
  isCurrent(index: number): boolean {
    return index === this.activeIndex();
  }

  /**
   * Returns `true` when `index` falls within the visible window
   * `[activeIndex, activeIndex + slidesPerView - 1]`.
   */
  isInView(index: number): boolean {
    const start = this.activeIndex();
    return index >= start && index < start + Math.max(1, this.slidesPerView());
  }

  /**
   * Returns `true` when `el` is the host of the first non-disabled indicator
   * in DOM order. Used by the tabindex fallback when no indicator is current.
   */
  isFirstEnabledIndicator(el: HTMLElement): boolean {
    return this.#firstEnabledIndicatorHost() === el;
  }

  /**
   * Returns `true` when at least one registered, non-disabled indicator
   * matches the current `activeIndex`. Used by the tabindex ladder to decide
   * whether the first-enabled fallback must reclaim the tab stop.
   */
  hasCurrentIndicator(): boolean {
    const active = this.activeIndex();
    return this.#indicators.items().some((i, idx) => idx === active && !i.disabled());
  }

  #move(action: ListNavigationAction): void {
    const next = moveIndex(this.activeIndex(), this.slideCount(), action, { loop: this.loop() });
    if (next !== null) {
      this.activeIndex.set(next);
    }
  }
}
