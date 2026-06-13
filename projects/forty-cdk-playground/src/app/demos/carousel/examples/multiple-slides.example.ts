import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForCarousel,
  ForCarouselIndicator,
  ForCarouselIndicators,
  ForCarouselNext,
  ForCarouselPrevious,
  ForCarouselSlide,
  ForCarouselTrack,
  ForCarouselViewport,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

interface Slide {
  readonly id: number;
  readonly label: string;
}

@Component({
  selector: 'app-carousel-multiple-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForCarousel,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselPrevious,
    ForCarouselNext,
    ForCarouselIndicators,
    ForCarouselIndicator,
    ControlSwitch,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Multiple slides per view"
      subtitle="Set slidesPerView > 1 to show several slides at once. The track uses flex: 0 0 calc(100% / slidesPerView) per slide, and a gap between them. Loop wraps around once the last visible set is reached."
      sourcePath="projects/forty-cdk-playground/src/app/demos/carousel/examples/multiple-slides.example.ts"
    >
      <div demo class="mcar-demo">
        <div
          forCarousel
          class="mcar"
          [(activeIndex)]="activeIndex"
          [loop]="loop()"
          [slidesPerView]="slidesPerView()"
          align="start"
          ariaLabel="Product gallery"
        >
          <div class="mcar-nav-row">
            <button forCarouselPrevious class="mcar-btn" aria-label="Previous slide">‹</button>
            <button forCarouselNext class="mcar-btn" aria-label="Next slide">›</button>
          </div>

          <div forCarouselViewport class="mcar-viewport">
            <div forCarouselTrack class="mcar-track">
              @for (slide of slides; track slide.id; let i = $index) {
                <div forCarouselSlide class="mcar-slide" [class]="'mcar-slide--' + ((i % 5) + 1)">
                  <span class="mcar-slide-label">{{ slide.label }}</span>
                </div>
              }
            </div>
          </div>

          <div forCarouselIndicators class="mcar-indicators" ariaLabel="Choose slide to display">
            @for (slide of slides; track slide.id; let i = $index) {
              <button
                forCarouselIndicator
                class="mcar-dot"
                [attr.aria-label]="'Go to slide ' + (i + 1)"
              ></button>
            }
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="slidesPerView"
          [options]="slidesPerViewOptions"
          [(value)]="slidesPerViewValue"
        />
        <app-control-switch label="loop" [(checked)]="loop" />
        <p class="pg-state">
          activeIndex: <b>{{ activeIndex() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .mcar-demo {
      width: min(480px, 100%);
    }

    .mcar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mcar-nav-row {
      display: flex;
      gap: 0.5rem;
    }

    .mcar-btn {
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

    .mcar-btn:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .mcar-btn[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .mcar-viewport {
      overflow: hidden;
      border-radius: var(--pg-radius);
    }

    .mcar-track {
      display: flex;
      gap: 0.5rem;
      transform: translateX(var(--for-carousel-offset));
      transition: transform 300ms ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .mcar-track {
        transition: none;
      }
    }

    .mcar-slide {
      flex: 0 0 calc((100% - 0.5rem * (var(--for-carousel-slides-per-view) - 1)) / var(--for-carousel-slides-per-view));
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--pg-radius-sm);
    }

    .mcar-slide--1 { background: color-mix(in srgb, var(--pg-primary) 20%, var(--pg-surface)); }
    .mcar-slide--2 { background: color-mix(in srgb, var(--pg-success) 20%, var(--pg-surface)); }
    .mcar-slide--3 { background: color-mix(in srgb, var(--pg-warning) 20%, var(--pg-surface)); }
    .mcar-slide--4 { background: color-mix(in srgb, var(--pg-primary) 35%, var(--pg-surface)); }
    .mcar-slide--5 { background: color-mix(in srgb, var(--pg-success) 35%, var(--pg-surface)); }

    .mcar-slide-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--pg-text);
    }

    .mcar-indicators {
      display: flex;
      gap: 0.35rem;
      justify-content: center;
    }

    .mcar-dot {
      appearance: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: none;
      background: var(--pg-border-strong);
      padding: 0;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .mcar-dot[aria-current='true'] {
      background: var(--pg-primary);
      transform: scale(1.4);
    }

    @media (prefers-reduced-motion: reduce) {
      .mcar-dot {
        transition: none;
      }
    }
  `,
})
export class CarouselMultipleExample {
  protected readonly slides: readonly Slide[] = [
    { id: 1, label: 'Slide 1' },
    { id: 2, label: 'Slide 2' },
    { id: 3, label: 'Slide 3' },
    { id: 4, label: 'Slide 4' },
    { id: 5, label: 'Slide 5' },
    { id: 6, label: 'Slide 6' },
  ];

  protected readonly slidesPerViewOptions: readonly ControlOption[] = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ];

  protected readonly activeIndex = signal(0);
  protected readonly loop = signal(true);

  protected readonly slidesPerViewValue = signal('3');
  protected readonly slidesPerView = computed(() => Number(this.slidesPerViewValue()));
}
