import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForCarousel,
  ForCarouselIndicator,
  ForCarouselIndicators,
  ForCarouselNext,
  ForCarouselPrevious,
  ForCarouselRotationControl,
  ForCarouselSlide,
  ForCarouselTrack,
  ForCarouselViewport,
} from 'forty-cdk/carousel';

interface Slide {
  readonly id: number;
  readonly label: string;
}

@Component({
  selector: 'app-carousel-autoplay-example',
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
    ForCarouselRotationControl,
  ],
  template: `
    <div
      forCarousel
      #car="forCarousel"
      class="acar"
      [(activeIndex)]="activeIndex"
      autoplay
      [autoplayInterval]="3000"
      loop
      ariaLabel="Auto-rotating announcements"
    >
      <button
        forCarouselRotationControl
        class="acar-rotation-btn"
        startLabel="Start automatic slide show"
        stopLabel="Stop automatic slide show"
      >
        <span class="sr-only">Toggle autoplay</span>
        @if (car.playing()) {
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8.25 5.25h3v13.5h-3zM12.75 5.25h3v13.5h-3z" fill="currentColor" />
          </svg>
        } @else {
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.75 5.25 17.25 12 6.75 18.75z" fill="currentColor" />
          </svg>
        }
      </button>

      <div class="acar-nav-row">
        <button forCarouselPrevious class="acar-btn" aria-label="Previous slide">
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
        <button forCarouselNext class="acar-btn" aria-label="Next slide">
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

      <div forCarouselViewport class="acar-viewport">
        <div forCarouselTrack class="acar-track">
          @for (slide of slides; track slide.id; let i = $index) {
            <div forCarouselSlide class="acar-slide" [class]="'acar-slide--' + (i + 1)">
              <span class="acar-slide-label">{{ slide.label }}</span>
            </div>
          }
        </div>
      </div>

      <div forCarouselIndicators class="acar-indicators" ariaLabel="Choose slide to display">
        @for (slide of slides; track slide.id; let i = $index) {
          <button
            forCarouselIndicator
            class="acar-dot"
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

    .acar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: min(400px, 100%);
    }

    .acar-rotation-btn {
      appearance: none;
      padding: 0;
      align-self: flex-start;
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      font-size: 1.1rem;
      cursor: pointer;
    }

    .acar-rotation-btn svg {
      width: 1em;
      height: 1em;
    }

    .acar-rotation-btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .acar-nav-row {
      display: flex;
      gap: 0.5rem;
    }

    .acar-btn {
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

    .acar-btn svg {
      width: 1em;
      height: 1em;
    }

    .acar-btn:hover:not([data-disabled]) {
      background: var(--ex-surface-2, #f2eee6);
    }

    .acar-btn[data-disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .acar-viewport {
      overflow: hidden;
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
    }

    .acar-track {
      display: flex;
      transform: translateX(var(--for-carousel-offset));
      transition: transform 300ms ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .acar-track {
        transition: none;
      }
    }

    .acar-slide {
      flex: 0 0 calc(100% / var(--for-carousel-slides-per-view));
      min-height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
    }

    .acar-slide--1 {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 20%, var(--ex-surface, #ffffff));
    }
    .acar-slide--2 {
      background: color-mix(in srgb, var(--ex-success, #1f7a4d) 20%, var(--ex-surface, #ffffff));
    }
    .acar-slide--3 {
      background: color-mix(in srgb, var(--ex-warning, #a5651a) 20%, var(--ex-surface, #ffffff));
    }
    .acar-slide--4 {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 35%, var(--ex-surface, #ffffff));
    }

    .acar-slide-label {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--ex-text, #17191c);
    }

    .acar-indicators {
      display: flex;
      gap: 0.35rem;
      justify-content: center;
    }

    .acar-dot {
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

    .acar-dot[aria-current='true'] {
      background: var(--ex-accent, #0e7c6b);
      transform: scale(1.4);
    }

    @media (prefers-reduced-motion: reduce) {
      .acar-dot {
        transition: none;
      }
    }
  `,
})
export class CarouselAutoplayExample {
  protected readonly slides: readonly Slide[] = [
    { id: 1, label: 'Slide 1' },
    { id: 2, label: 'Slide 2' },
    { id: 3, label: 'Slide 3' },
    { id: 4, label: 'Slide 4' },
  ];

  protected readonly activeIndex = signal(0);
}
