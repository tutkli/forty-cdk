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
  selector: 'app-carousel-basic-example',
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
      title="Basic"
      subtitle="Prev / next buttons, indicator group, and optional looping. Orientation switches the slide axis; align controls which edge of the active slide aligns with the viewport."
      sourcePath="projects/forty-cdk-playground/src/app/demos/carousel/examples/basic.example.ts"
    >
      <div demo class="car-demo">
        <div
          forCarousel
          class="car"
          [(activeIndex)]="activeIndex"
          [loop]="loop()"
          [orientation]="orientation()"
          [align]="align()"
          ariaLabel="Featured slides"
          [class.car--vertical]="orientation() === 'vertical'"
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
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="loop" [(checked)]="loop" />
        <app-control-select
          label="orientation"
          [options]="orientationOptions"
          [(value)]="orientationValue"
        />
        <app-control-select
          label="align"
          hint="Which edge of the active slide aligns with the viewport."
          [options]="alignOptions"
          [(value)]="alignValue"
        />
        <p class="pg-state">
          activeIndex: <b>{{ activeIndex() }}</b
          ><br />
          slides: <b>{{ slides.length }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .car-demo {
      width: min(400px, 100%);
    }

    .car {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .car--vertical {
      flex-direction: row;
      align-items: flex-start;
    }

    .car-controls-row {
      display: flex;
      gap: 0.5rem;
    }

    .car--vertical .car-controls-row {
      flex-direction: column;
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

    .car-btn:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .car-btn[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .car-viewport {
      overflow: hidden;
      border-radius: var(--pg-radius);
    }

    .car--vertical .car-viewport {
      height: 180px;
    }

    .car-track {
      display: flex;
      transform: translateX(var(--for-carousel-offset));
      transition: transform 300ms ease;
    }

    .car[data-orientation='vertical'] .car-track {
      flex-direction: column;
      transform: translateY(var(--for-carousel-offset));
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

    .car--vertical .car-slide {
      min-height: 180px;
    }

    .car-slide--1 { background: color-mix(in srgb, var(--pg-primary) 20%, var(--pg-surface)); }
    .car-slide--2 { background: color-mix(in srgb, var(--pg-success) 20%, var(--pg-surface)); }
    .car-slide--3 { background: color-mix(in srgb, var(--pg-warning) 20%, var(--pg-surface)); }
    .car-slide--4 { background: color-mix(in srgb, var(--pg-primary) 35%, var(--pg-surface)); }
    .car-slide--5 { background: color-mix(in srgb, var(--pg-success) 35%, var(--pg-surface)); }

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
      transition: background 0.2s ease, transform 0.2s ease;
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
export class CarouselBasicExample {
  protected readonly slides: readonly Slide[] = [
    { id: 1, label: 'Slide 1' },
    { id: 2, label: 'Slide 2' },
    { id: 3, label: 'Slide 3' },
    { id: 4, label: 'Slide 4' },
    { id: 5, label: 'Slide 5' },
  ];

  protected readonly orientationOptions: readonly ControlOption<'horizontal' | 'vertical'>[] = [
    { value: 'horizontal', label: 'horizontal' },
    { value: 'vertical', label: 'vertical' },
  ];

  protected readonly alignOptions: readonly ControlOption<'start' | 'center' | 'end'>[] = [
    { value: 'start', label: 'start' },
    { value: 'center', label: 'center' },
    { value: 'end', label: 'end' },
  ];

  protected readonly activeIndex = signal(0);
  protected readonly loop = signal(false);

  protected readonly orientationValue = signal<string>('horizontal');
  protected readonly orientation = computed(
    () => this.orientationValue() as 'horizontal' | 'vertical',
  );

  protected readonly alignValue = signal<string>('start');
  protected readonly align = computed(() => this.alignValue() as 'start' | 'center' | 'end');
}
