import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  model,
  numberAttribute,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import { injectElementSize } from '../_internal/element-size/element-size';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectPrefersReducedMotion } from '../_internal/media-query/media-query';
import {
  injectPauseController,
  type PauseController,
} from '../_internal/pausable/pause-controller';
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
    '[attr.data-autoplay]': 'autoplay() ? "" : null',
    '[attr.data-rotating]': 'rotating() ? "" : null',
    '(pointerenter)': 'onAutoplayPause("hover")',
    '(pointerleave)': 'onAutoplayResume("hover")',
    '(focusin)': 'onAutoplayPause("focus")',
    '(focusout)': 'onAutoplayFocusOut($event)',
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
   * When `true` and the carousel is not looping, clamps `--for-carousel-offset` so the
   * trailing slides align flush to the viewport's trailing edge instead of overscrolling
   * into empty space (relevant when `slidesPerView > 1`). The one-indicator-per-slide
   * mapping is preserved — `activeIndex` still reaches the last slide; only the visual
   * offset is contained. No effect when `loop` is enabled or `slidesPerView` is 1.
   * Default from `provideForCarouselDefaults` or `false`.
   */
  readonly containScroll = input(this.#defaults.containScroll, { transform: booleanAttribute });

  /**
   * Accessible label for the carousel root (`role="group"`). Should describe
   * the carousel's purpose without using the word "carousel" (APG guidance).
   * When null (default), no `aria-label` is emitted; use `aria-labelledby`
   * instead when a visible heading labels the carousel.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Whether the carousel auto-rotates. When `true` and the user has not
   * explicitly stopped it, rotation starts on mount — *unless*
   * `prefers-reduced-motion: reduce` is set, which suppresses auto-start
   * (the user can still start it via the rotation control). Default from
   * `provideForCarouselDefaults` or `false`.
   *
   * APG requires a `[forCarouselRotationControl]` to be present whenever
   * autoplay is enabled. The directive does not enforce this — see the README.
   */
  readonly autoplay = input(this.#defaults.autoplay, { transform: booleanAttribute });

  /**
   * Milliseconds between automatic slide advances while rotating. Values
   * `<= 0` disable the timer. Default from `provideForCarouselDefaults` or `5000`.
   */
  readonly autoplayInterval = input(this.#defaults.autoplayInterval, {
    transform: numberAttribute,
  });

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

  readonly #destroyRef = inject(DestroyRef);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #prefersReducedMotion = injectPrefersReducedMotion();

  readonly #userPlaying = signal<boolean | null>(null);

  /** Whether auto-rotation is "on" (user intent). Sticky once the user decides. */
  readonly playing = computed(
    () => this.#userPlaying() ?? (this.autoplay() && !this.#prefersReducedMotion()),
  );

  readonly #pause: PauseController<'hover' | 'focus' | 'visibility'> = injectPauseController();

  /** Whether the carousel is actively auto-rotating right now. */
  readonly rotating = computed(() => this.playing() && !this.#pause.paused());

  #timerHandle: ReturnType<typeof setInterval> | null = null;

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
    const raw = base + adjust;
    if (this.containScroll() && !this.loop()) {
      const minOffset = -(Math.max(0, this.slideCount() - perView) * slideSizePct);
      return `${Math.min(0, Math.max(minOffset, raw))}%`;
    }
    return `${raw}%`;
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

    effect(() => {
      const rotating = this.rotating();
      const interval = this.autoplayInterval();
      untracked(() => this.#syncTimer(rotating, interval));
    });
    this.#destroyRef.onDestroy(() => this.#clearTimer());

    if (isDevMode()) {
      let warned = false;
      effect(() => {
        const slides = this.slideCount();
        const indicators = this.#indicators.items().length;
        if (indicators === 0 || indicators === slides) {
          warned = false;
        } else if (!warned) {
          warned = true;
          console.warn(
            `[forty-cdk/carousel] ${indicators} [forCarouselIndicator] element(s) registered for ${slides} slide(s). ` +
              `The picker assumes one indicator per slide (indicator at DOM index i targets slide i); a mismatched count ` +
              `desynchronizes the active-indicator state. Render exactly one [forCarouselIndicator] per [forCarouselSlide].`,
          );
        }
      });
    }
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

  /**
   * Resolve the positional slide `aria-label` from the scope's defaults
   * (`"N of M"` unless localized via `provideForCarouselDefaults`).
   * `position` is the 1-based slide index.
   */
  slideLabel(position: number): string {
    return this.#defaults.slideLabel(position, this.slideCount());
  }

  /**
   * Resolve the indicator `aria-label` from the scope's defaults
   * (`"Go to slide N"` unless localized via `provideForCarouselDefaults`).
   * `position` is the 1-based slide index.
   */
  indicatorLabel(position: number): string {
    return this.#defaults.indicatorLabel(position);
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
   *
   * Assumes the one-indicator-per-slide mapping the rest of the picker is built
   * on: the indicator at DOM index `i` targets slide `i`. A mismatched indicator
   * count is dev-guarded by a `console.warn` at construction.
   */
  hasCurrentIndicator(): boolean {
    const active = this.activeIndex();
    return this.#indicators.items().some((i, idx) => idx === active && !i.disabled());
  }

  /** Start auto-rotation (explicit, sticky). Overrides the reduced-motion auto-start gate. */
  play(): void {
    this.#userPlaying.set(true);
  }

  /** Stop auto-rotation (explicit, sticky). Hover/focus/visibility changes will not restart it. */
  pause(): void {
    this.#userPlaying.set(false);
  }

  /** Toggle auto-rotation. Called by `[forCarouselRotationControl]`. */
  toggleAutoplay(): void {
    this.#userPlaying.set(!this.playing());
  }

  protected onAutoplayPause(reason: 'hover' | 'focus'): void {
    this.#pause.apply(reason);
  }

  protected onAutoplayResume(reason: 'hover' | 'focus'): void {
    this.#pause.release(reason);
  }

  protected onAutoplayFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.#element.nativeElement.contains(next)) {
      return;
    }
    this.#pause.release('focus');
  }

  #syncTimer(rotating: boolean, interval: number): void {
    this.#clearTimer();
    if (this.#isBrowser && rotating && interval > 0) {
      this.#timerHandle = setInterval(() => this.#advance(), interval);
    }
  }

  #advance(): void {
    const count = this.slideCount();
    if (count > 0) {
      this.activeIndex.set((this.activeIndex() + 1) % count);
    }
  }

  #clearTimer(): void {
    if (this.#timerHandle !== null) {
      clearInterval(this.#timerHandle);
      this.#timerHandle = null;
    }
  }

  #move(action: ListNavigationAction): void {
    const next = moveIndex(this.activeIndex(), this.slideCount(), action, { loop: this.loop() });
    if (next !== null) {
      this.activeIndex.set(next);
    }
  }
}
