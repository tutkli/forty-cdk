import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForCarousel,
  ForCarouselDrag,
  ForCarouselIndicator,
  ForCarouselIndicators,
  ForCarouselNext,
  ForCarouselPrevious,
  ForCarouselSlide,
  ForCarouselTrack,
  ForCarouselViewport,
} from 'forty-cdk/carousel';

interface Slide {
  readonly id: number;
  readonly title: string;
  readonly summary: string;
}

@Component({
  selector: 'app-carousel-drag-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForCarousel,
    ForCarouselViewport,
    ForCarouselDrag,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselPrevious,
    ForCarouselNext,
    ForCarouselIndicators,
    ForCarouselIndicator,
  ],
  template: `
    <div
      forCarousel
      class="dcar"
      [(activeIndex)]="activeIndex"
      orientation="horizontal"
      ariaLabel="Draggable gallery"
    >
      <div class="dcar-controls-row">
        <button forCarouselPrevious class="dcar-btn" aria-label="Previous slide">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m15.75 19.5-7.5-7.5 7.5-7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button forCarouselNext class="dcar-btn" aria-label="Next slide">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div forCarouselViewport forCarouselDrag class="dcar-viewport">
        <div forCarouselTrack class="dcar-track">
          @for (slide of slides; track slide.id; let i = $index) {
            <div forCarouselSlide class="dcar-slide" [class]="'dcar-slide--' + (i + 1)">
              <p class="dcar-slide-title">{{ slide.title }}</p>
              <p class="dcar-slide-summary">{{ slide.summary }}</p>
            </div>
          }
        </div>
      </div>

      <div forCarouselIndicators class="dcar-indicators" ariaLabel="Choose slide to display">
        @for (slide of slides; track slide.id; let i = $index) {
          <button
            forCarouselIndicator
            class="dcar-dot"
            [attr.aria-label]="'Go to slide ' + (i + 1)"
          ></button>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .dcar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: min(400px, 100%);
    }

    .dcar-controls-row {
      display: flex;
      gap: 0.5rem;
    }

    .dcar-btn {
      appearance: none;
      padding: 0;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }

    .dcar-btn svg {
      width: 1em;
      height: 1em;
    }

    .dcar-btn:hover:not([data-disabled]) {
      background: var(--ex-surface-2, #f2eee6);
    }

    .dcar-btn[data-disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dcar-viewport {
      overflow: hidden;
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      cursor: grab;
    }

    .dcar-viewport[data-dragging] {
      cursor: grabbing;
      user-select: none;
    }

    .dcar-track {
      display: flex;
      transform: translateX(
        calc(var(--for-carousel-offset) + var(--for-carousel-swipe-movement-x, 0px))
      );
      transition: transform 300ms ease;
    }

    .dcar-viewport[data-dragging] .dcar-track {
      transition: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .dcar-track {
        transition: none;
      }
    }

    .dcar-slide {
      flex: 0 0 calc(100% / var(--for-carousel-slides-per-view));
      min-height: 160px;
      box-sizing: border-box;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 0.35rem;
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
    }

    .dcar-slide--1 {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 20%, var(--ex-surface, #ffffff));
    }
    .dcar-slide--2 {
      background: color-mix(in srgb, var(--ex-success, #1f7a4d) 20%, var(--ex-surface, #ffffff));
    }
    .dcar-slide--3 {
      background: color-mix(in srgb, var(--ex-warning, #a5651a) 20%, var(--ex-surface, #ffffff));
    }
    .dcar-slide--4 {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 35%, var(--ex-surface, #ffffff));
    }
    .dcar-slide--5 {
      background: color-mix(in srgb, var(--ex-success, #1f7a4d) 35%, var(--ex-surface, #ffffff));
    }

    .dcar-slide-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--ex-text, #17191c);
    }

    .dcar-slide-summary {
      margin: 0;
      font-size: 0.9rem;
      color: var(--ex-muted, #585d66);
    }

    .dcar-indicators {
      display: flex;
      gap: 0.35rem;
      justify-content: center;
    }

    .dcar-dot {
      appearance: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: none;
      background: var(--ex-border-strong, #d0c9bc);
      padding: 0;
      cursor: pointer;
      transition:
        background 0.2s ease,
        transform 0.2s ease;
    }

    .dcar-dot[aria-current='true'] {
      background: var(--ex-accent, #0e7c6b);
      transform: scale(1.4);
    }

    @media (prefers-reduced-motion: reduce) {
      .dcar-dot {
        transition: none;
      }
    }
  `,
})
export class CarouselDragExample {
  protected readonly slides: readonly Slide[] = [
    {
      id: 1,
      title: 'Harbour at dusk',
      summary: 'Fishing boats back in before the lights come on.',
    },
    { id: 2, title: 'Pine ridge', summary: 'The last climb of the trail, above the tree line.' },
    { id: 3, title: 'Salt flats', summary: 'A white horizon that turns pink at sunrise.' },
    {
      id: 4,
      title: 'Old town steps',
      summary: 'Two hundred stairs between the market and the fort.',
    },
    { id: 5, title: 'Glacier lake', summary: 'Still water, cold enough to hurt your hands.' },
  ];

  protected readonly activeIndex = signal(0);
}
