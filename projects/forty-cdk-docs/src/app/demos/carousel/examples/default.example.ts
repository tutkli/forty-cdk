import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForCarousel,
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
  selector: 'app-carousel-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForCarousel,
    ForCarouselViewport,
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
      class="car"
      [(activeIndex)]="activeIndex"
      loop
      orientation="horizontal"
      align="start"
      ariaLabel="Featured stories"
    >
      <div class="car-controls-row">
        <button forCarouselPrevious class="car-btn" aria-label="Previous slide">
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
        <button forCarouselNext class="car-btn" aria-label="Next slide">
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

      <div forCarouselViewport class="car-viewport">
        <div forCarouselTrack class="car-track">
          @for (slide of slides; track slide.id; let i = $index) {
            <div forCarouselSlide class="car-slide" [class]="'car-slide--' + (i + 1)">
              <p class="car-slide-title">{{ slide.title }}</p>
              <p class="car-slide-summary">{{ slide.summary }}</p>
            </div>
          }
        </div>
      </div>

      <div forCarouselIndicators class="car-indicators" ariaLabel="Choose slide to display">
        @for (slide of slides; track slide.id; let i = $index) {
          <button
            forCarouselIndicator
            class="car-dot"
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

    .car {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: min(400px, 100%);
    }

    .car-controls-row {
      display: flex;
      gap: 0.5rem;
    }

    .car-btn {
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

    .car-btn svg {
      width: 1em;
      height: 1em;
    }

    .car-btn:hover:not([data-disabled]) {
      background: var(--ex-surface-2, #f2eee6);
    }

    .car-btn[data-disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .car-viewport {
      overflow: hidden;
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
    }

    .car-track {
      display: flex;
      transform: translateX(var(--for-carousel-offset));
      transition: transform 300ms ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .car-track {
        transition: none;
      }
    }

    .car-slide {
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

    .car-slide--1 {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 20%, var(--ex-surface, #ffffff));
    }
    .car-slide--2 {
      background: color-mix(in srgb, var(--ex-success, #1f7a4d) 20%, var(--ex-surface, #ffffff));
    }
    .car-slide--3 {
      background: color-mix(in srgb, var(--ex-warning, #a5651a) 20%, var(--ex-surface, #ffffff));
    }
    .car-slide--4 {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 35%, var(--ex-surface, #ffffff));
    }
    .car-slide--5 {
      background: color-mix(in srgb, var(--ex-success, #1f7a4d) 35%, var(--ex-surface, #ffffff));
    }

    .car-slide-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--ex-text, #17191c);
    }

    .car-slide-summary {
      margin: 0;
      font-size: 0.9rem;
      color: var(--ex-muted, #585d66);
    }

    .car-indicators {
      display: flex;
      gap: 0.35rem;
      justify-content: center;
    }

    .car-dot {
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

    .car-dot[aria-current='true'] {
      background: var(--ex-accent, #0e7c6b);
      transform: scale(1.4);
    }

    @media (prefers-reduced-motion: reduce) {
      .car-dot {
        transition: none;
      }
    }
  `,
})
export class CarouselDefaultExample {
  protected readonly slides: readonly Slide[] = [
    {
      id: 1,
      title: 'The coast road north',
      summary: 'Four days, three ferries and one small car.',
    },
    {
      id: 2,
      title: 'Markets before dawn',
      summary: 'Where the city buys its fish, flowers and coffee.',
    },
    {
      id: 3,
      title: 'A week without screens',
      summary: 'What changed, and the one habit that stuck.',
    },
    { id: 4, title: 'Bread, slowly', summary: 'A starter, a schedule and a forgiving first loaf.' },
    {
      id: 5,
      title: 'Mapping the old river',
      summary: 'Tracing a buried stream through five neighbourhoods.',
    },
  ];

  protected readonly activeIndex = signal(0);
}
