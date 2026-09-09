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
  readonly label: string;
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
        <button forCarouselPrevious class="dcar-btn" aria-label="Previous slide">‹</button>
        <button forCarouselNext class="dcar-btn" aria-label="Next slide">›</button>
      </div>

      <div forCarouselViewport forCarouselDrag class="dcar-viewport">
        <div forCarouselTrack class="dcar-track">
          @for (slide of slides; track slide.id; let i = $index) {
            <div forCarouselSlide class="dcar-slide" [class]="'dcar-slide--' + (i + 1)">
              <span class="dcar-slide-label">{{ slide.label }}</span>
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

    .dcar-btn:hover:not([data-disabled]) {
      background: var(--pg-surface-2);
    }

    .dcar-btn[data-disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dcar-viewport {
      overflow: hidden;
      border-radius: var(--pg-radius);
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
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--pg-radius);
    }

    .dcar-slide--1 {
      background: color-mix(in srgb, var(--pg-primary) 20%, var(--pg-surface));
    }
    .dcar-slide--2 {
      background: color-mix(in srgb, var(--pg-success) 20%, var(--pg-surface));
    }
    .dcar-slide--3 {
      background: color-mix(in srgb, var(--pg-warning) 20%, var(--pg-surface));
    }
    .dcar-slide--4 {
      background: color-mix(in srgb, var(--pg-primary) 35%, var(--pg-surface));
    }
    .dcar-slide--5 {
      background: color-mix(in srgb, var(--pg-success) 35%, var(--pg-surface));
    }

    .dcar-slide-label {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--pg-text);
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
      background: var(--pg-border-strong);
      padding: 0;
      cursor: pointer;
      transition:
        background 0.2s ease,
        transform 0.2s ease;
    }

    .dcar-dot[aria-current='true'] {
      background: var(--pg-primary);
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
    { id: 1, label: 'Slide 1' },
    { id: 2, label: 'Slide 2' },
    { id: 3, label: 'Slide 3' },
    { id: 4, label: 'Slide 4' },
    { id: 5, label: 'Slide 5' },
  ];

  protected readonly activeIndex = signal(0);
}
