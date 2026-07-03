import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  attachSwipeDismiss,
  type SwipeDirection,
  type SwipeEventDetail,
  isScrollableAtEdge,
  injectPrefersReducedMotion,
} from 'forty-cdk/core';
import { injectCarouselContext } from './carousel-context';

const FLICK_VELOCITY_PX_PER_MS = 0.4;
const FLICK_STALE_VELOCITY_MS = 100;

/**
 * Opt-in pointer drag / swipe directive for the Carousel viewport. Apply on the
 * `[forCarouselViewport]` element to enable horizontal or vertical drag-to-navigate.
 *
 * Publishes `--for-carousel-drag` (px) during the gesture so the consumer can
 * compose it with `--for-carousel-offset` for live track motion. Reflects
 * `data-dragging` while the gesture is armed. Sets `touch-action` automatically
 * to free the cross axis for page scrolling.
 *
 * Under `prefers-reduced-motion: reduce` the live offset is suppressed, but the
 * gesture still snaps `activeIndex` on release (D3).
 */
@Directive({
  selector: '[forCarouselDrag]',
  exportAs: 'forCarouselDrag',
  host: {
    '[style.--for-carousel-drag]': 'dragVar()',
    '[attr.data-dragging]': "dragging() ? '' : null",
    '[style.touch-action]': 'touchAction()',
    '(dragstart)': 'onDragStart($event)',
  },
})
export class ForCarouselDrag {
  protected readonly ctx = injectCarouselContext('ForCarouselDrag');

  /** Disable pointer drag without removing the directive. Default `false`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #prefersReducedMotion = injectPrefersReducedMotion();

  readonly #dragging = signal(false);
  readonly #dragPx = signal(0);

  /** Whether a drag gesture is currently armed (reflected as `data-dragging`). */
  readonly dragging = this.#dragging.asReadonly();

  /** `touch-action` for the viewport: capture the primary axis, free the cross axis. */
  readonly touchAction = computed<string | null>(() => {
    if (this.disabled()) return null;
    return this.ctx.orientation() === 'vertical' ? 'pan-x' : 'pan-y';
  });

  /** Live offset CSS var; suppressed at rest and under reduced motion (D3). */
  readonly dragVar = computed<string | null>(() => {
    if (this.#prefersReducedMotion()) return null;
    const px = this.#dragPx();
    return this.#dragging() && px !== 0 ? `${px}px` : null;
  });

  #startPrimary = 0;
  #lastPrimary = 0;
  #lastTime = 0;
  #velocity = 0;
  #slideSizePx = 0;

  constructor() {
    if (!this.#isBrowser) return;
    const cleanup = attachSwipeDismiss({
      element: this.#host.nativeElement,
      getDirections: () => this.#directions(),
      getThreshold: () => 1,
      onSwipeStart: (d) => this.#onStart(d),
      onSwipeMove: (d) => this.#onMove(d),
      onSwipeEnd: (d) => this.#onRelease(d),
      onSwipeCancel: (d) => this.#onRelease(d),
    });
    this.#destroyRef.onDestroy(cleanup);
  }

  protected onDragStart(event: Event): void {
    if (this.#dragging()) event.preventDefault();
  }

  #directions(): readonly SwipeDirection[] {
    if (this.disabled()) return [];
    return this.ctx.orientation() === 'vertical' ? ['up', 'down'] : ['left', 'right'];
  }

  #primary(event: PointerEvent): number {
    return this.ctx.orientation() === 'vertical' ? event.clientY : event.clientX;
  }

  /** +1 if a positive primary-axis delta moves toward a higher index, else -1. */
  #nextPerPx(): number {
    // horizontal LTR: finger left (clientX↓) → next → -1
    // horizontal RTL: finger right (clientX↑) → next → +1
    // vertical:       finger up (clientY↓) → next → -1
    return this.ctx.orientation() === 'horizontal' && this.ctx.dir() === 'rtl' ? 1 : -1;
  }

  #onStart(detail: SwipeEventDetail): void {
    const target = detail.originalEvent.target as Element | null;
    if (target && isScrollableAtEdge(target, detail.direction, this.#host.nativeElement)) {
      this.#dragging.set(false);
      return;
    }
    const rect = this.#host.nativeElement.getBoundingClientRect();
    const axisSize = this.ctx.orientation() === 'vertical' ? rect.height : rect.width;
    this.#slideSizePx = axisSize / Math.max(1, this.ctx.slidesPerView());

    const p = this.#primary(detail.originalEvent);
    this.#startPrimary = p;
    this.#lastPrimary = p;
    this.#lastTime = detail.originalEvent.timeStamp || 0;
    this.#velocity = 0;
    this.#dragPx.set(0);
    this.#dragging.set(true);
  }

  #onMove(detail: SwipeEventDetail): void {
    if (!this.#dragging()) return;
    const event = detail.originalEvent;
    const p = this.#primary(event);
    const now = event.timeStamp || this.#lastTime + 1;
    const dt = Math.max(1, now - this.#lastTime);
    this.#velocity = (p - this.#lastPrimary) / dt;
    this.#lastPrimary = p;
    this.#lastTime = now;
    this.#dragPx.set(p - this.#startPrimary);
  }

  #onRelease(detail: SwipeEventDetail): void {
    if (!this.#dragging()) return;
    const dragPx = this.#dragPx();
    const releaseTime = detail.originalEvent.timeStamp || this.#lastTime;
    const staleVelocity = releaseTime - this.#lastTime > FLICK_STALE_VELOCITY_MS;
    this.#dragging.set(false);
    this.#dragPx.set(0);

    if (this.#slideSizePx <= 0) return;

    const sign = this.#nextPerPx();
    const slidesDragged = (dragPx * sign) / this.#slideSizePx;
    const velocityTowardNext = flickVelocity(this.#velocity * sign, staleVelocity);
    const target = resolveDragIndex(this.ctx.activeIndex(), slidesDragged, velocityTowardNext);
    this.ctx.scrollTo(target);
  }
}

/**
 * Zeroes the flick velocity when the release is stale (its last move sample is older than
 * `FLICK_STALE_VELOCITY_MS`), so a pause before lifting can't carry a stale sample into the snap.
 * Returns the effective velocity fed to `resolveDragIndex`.
 */
export function flickVelocity(rawVelocityTowardNext: number, stale: boolean): number {
  return stale ? 0 : rawVelocityTowardNext;
}

/**
 * Pure nearest-index snap with velocity bias. `slidesDragged` is signed (positive
 * toward a higher index); `velocityTowardNext` is px/ms (positive toward a higher
 * index). A fast flick rounds toward the flick direction instead of to nearest.
 * Returns a raw (possibly out-of-range) index; the caller's `scrollTo` normalizes it.
 */
export function resolveDragIndex(
  activeIndex: number,
  slidesDragged: number,
  velocityTowardNext: number,
): number {
  const float = activeIndex + slidesDragged;
  if (velocityTowardNext >= FLICK_VELOCITY_PX_PER_MS) return Math.ceil(float);
  if (velocityTowardNext <= -FLICK_VELOCITY_PX_PER_MS) return Math.floor(float);
  return Math.round(float);
}
