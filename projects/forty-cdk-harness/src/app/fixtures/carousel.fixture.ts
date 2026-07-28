import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForCarousel,
  ForCarouselDrag,
  ForCarouselIndicator,
  ForCarouselIndicators,
  ForCarouselNext,
  ForCarouselPrevious,
  ForCarouselRotationControl,
  ForCarouselSlide,
  ForCarouselTrack,
  ForCarouselViewport,
} from 'forty-cdk/carousel';

/**
 * Carousel harness fixture — exercises the WAI-ARIA Carousel keyboard journey
 * and geometry on real browsers (roving tabindex, ArrowLeft/Right/Down/Up,
 * Home/End, RTL, prev/next disabled states, viewport geometry CSS vars,
 * autoplay rotation control).
 *
 * Mounts 4 slides (0–3) so disabled-skip and loop wrap-around have room to
 * exercise.
 *
 * Query params:
 *  - `?orientation=vertical` — switches to the vertical axis.
 *  - `?loop=1` — enables wrap-around.
 *  - `?slidesPerView=2` — shows two slides at once.
 *  - `?dir=rtl` — flips arrow-key semantics.
 *  - `?align=center` / `?align=end` — alignment of the active slide.
 *  - `?autoplay=1` — enables auto-rotation.
 *  - `?autoplayInterval=400` — ms between auto-advances (default 400 for fast tests).
 */
@Component({
  selector: 'app-carousel-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForCarousel,
    ForCarouselDrag,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselPrevious,
    ForCarouselNext,
    ForCarouselIndicators,
    ForCarouselIndicator,
    ForCarouselRotationControl,
  ],
  styles: [
    `
      [forCarouselViewport] {
        overflow: hidden;
        width: 400px;
        height: 200px;
      }
      [forCarouselTrack] {
        display: flex;
        transform: translateX(
          calc(var(--for-carousel-offset) + var(--for-carousel-swipe-movement-x, 0px))
        );
        transition: none;
      }
      [forCarousel][data-orientation='vertical'] [forCarouselTrack] {
        flex-direction: column;
        transform: translateY(
          calc(var(--for-carousel-offset) + var(--for-carousel-swipe-movement-y, 0px))
        );
      }
      [forCarouselSlide] {
        flex: 0 0 calc(100% / var(--for-carousel-slides-per-view));
        min-width: 0;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
      }
      [data-testid='scroll-content'] {
        width: 100%;
        overflow-x: auto;
        white-space: nowrap;
      }
      [data-testid='scroll-content'] .wide {
        display: inline-block;
        width: 1200px;
        height: 1px;
      }
    `,
  ],
  template: `
    <input data-testid="before" placeholder="before-carousel" />
    <div
      forCarousel
      [(activeIndex)]="active"
      [loop]="loop"
      [orientation]="orientation"
      [dir]="dir"
      [align]="align"
      [slidesPerView]="slidesPerView"
      [autoplay]="autoplay"
      [autoplayInterval]="autoplayInterval"
      ariaLabel="Test carousel"
      data-testid="carousel-root"
    >
      <button forCarouselRotationControl data-testid="rotation">&#x25B6;</button>
      <button forCarouselPrevious aria-label="Previous slide" data-testid="prev"></button>

      <div
        forCarouselViewport
        forCarouselDrag
        data-testid="viewport"
        (gotpointercapture)="onPointerCapture()"
      >
        <div forCarouselTrack data-testid="track">
          @for (slide of slides(); track slide) {
            <div forCarouselSlide [attr.data-testid]="'slide-' + slide">
              @if (scrollable && slide === 0) {
                <div data-testid="scroll-content">
                  <button data-testid="scroll-click" type="button" (click)="onScrollClick()">
                    Scroll click
                  </button>
                  <span class="wide"></span>
                </div>
              } @else {
                Slide {{ slide }}
              }
            </div>
          }
        </div>
      </div>

      <button forCarouselNext aria-label="Next slide" data-testid="next"></button>

      <div forCarouselIndicators ariaLabel="Choose slide to display" data-testid="indicators">
        @for (slide of slides(); track slide; let i = $index) {
          <button
            forCarouselIndicator
            [attr.aria-label]="'Go to slide ' + (i + 1)"
            [attr.data-testid]="'indicator-' + i"
          ></button>
        }
      </div>
    </div>
    <input data-testid="after" placeholder="after-carousel" />
    <output data-testid="scroll-click-count">{{ clickCount() }}</output>
    <output data-testid="capture-count">{{ captureCount() }}</output>
  `,
})
export class CarouselFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly orientation: 'horizontal' | 'vertical' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'vertical'
      ? 'vertical'
      : 'horizontal';

  protected readonly loop: boolean = this.#route.snapshot.queryParamMap.get('loop') === '1';

  protected readonly slidesPerView: number = Number(
    this.#route.snapshot.queryParamMap.get('slidesPerView') ?? '1',
  );

  protected readonly dir: 'ltr' | 'rtl' =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';

  protected readonly align: 'start' | 'center' | 'end' =
    (this.#route.snapshot.queryParamMap.get('align') as 'start' | 'center' | 'end' | null) ??
    'start';

  protected readonly autoplay: boolean = this.#route.snapshot.queryParamMap.get('autoplay') === '1';

  protected readonly autoplayInterval: number = Number(
    this.#route.snapshot.queryParamMap.get('autoplayInterval') ?? '400',
  );

  protected readonly scrollable: boolean =
    this.#route.snapshot.queryParamMap.get('scrollable') === '1';

  protected readonly active = signal(0);

  protected readonly slides = signal([0, 1, 2, 3]);

  protected readonly clickCount = signal(0);

  protected readonly captureCount = signal(0);

  protected onScrollClick(): void {
    this.clickCount.update((n) => n + 1);
  }

  protected onPointerCapture(): void {
    this.captureCount.update((n) => n + 1);
  }
}
