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
  readonly label: string;
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
      ariaLabel="Featured slides"
    >
      <div class="car-controls-row">
        <button forCarouselPrevious class="car-btn" aria-label="Previous slide">‹</button>
        <button forCarouselNext class="car-btn" aria-label="Next slide">›</button>
      </div>

      <div forCarouselViewport class="car-viewport">
        <div forCarouselTrack class="car-track">
          @for (slide of slides; track slide.id; let i = $index) {
            <div forCarouselSlide class="car-slide" [class]="'car-slide--' + (i + 1)">
              <span class="car-slide-label">{{ slide.label }}</span>
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
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }

    .car-btn:hover:not([data-disabled]) {
      background: var(--pg-surface-2);
    }

    .car-btn[data-disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .car-viewport {
      overflow: hidden;
      border-radius: var(--pg-radius);
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
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--pg-radius);
    }

    .car-slide--1 {
      background: color-mix(in srgb, var(--pg-primary) 20%, var(--pg-surface));
    }
    .car-slide--2 {
      background: color-mix(in srgb, var(--pg-success) 20%, var(--pg-surface));
    }
    .car-slide--3 {
      background: color-mix(in srgb, var(--pg-warning) 20%, var(--pg-surface));
    }
    .car-slide--4 {
      background: color-mix(in srgb, var(--pg-primary) 35%, var(--pg-surface));
    }
    .car-slide--5 {
      background: color-mix(in srgb, var(--pg-success) 35%, var(--pg-surface));
    }

    .car-slide-label {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--pg-text);
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
      background: var(--pg-border-strong);
      padding: 0;
      cursor: pointer;
      transition:
        background 0.2s ease,
        transform 0.2s ease;
    }

    .car-dot[aria-current='true'] {
      background: var(--pg-primary);
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
    { id: 1, label: 'Slide 1' },
    { id: 2, label: 'Slide 2' },
    { id: 3, label: 'Slide 3' },
    { id: 4, label: 'Slide 4' },
    { id: 5, label: 'Slide 5' },
  ];

  protected readonly activeIndex = signal(0);
}
