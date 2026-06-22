import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
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

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

interface Slide {
  readonly id: number;
  readonly label: string;
}

@Component({
  selector: 'app-carousel-autoplay-example',
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
    ForCarouselRotationControl,
    ControlSwitch,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Autoplay with pause control"
      subtitle="The rotation control is the first focusable child (APG / WCAG 2.2.2 requirement). Rotation pauses on hover, keyboard focus inside the carousel, and while the tab is backgrounded. An explicit stop (clicking the control) is sticky — hover and focus will not restart it. Under prefers-reduced-motion, rotation does not auto-start but the user can start it manually."
      sourcePath="projects/forty-cdk-playground/src/app/demos/carousel/examples/autoplay.example.ts"
    >
      <div demo class="acar-demo">
        <div
          forCarousel
          #car="forCarousel"
          class="acar"
          [(activeIndex)]="activeIndex"
          [autoplay]="autoplayOn()"
          [autoplayInterval]="autoplayInterval()"
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
          </button>

          <div class="acar-nav-row">
            <button forCarouselPrevious class="acar-btn" aria-label="Previous slide">‹</button>
            <button forCarouselNext class="acar-btn" aria-label="Next slide">›</button>
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
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="autoplay" [(checked)]="autoplayOn" />
        <app-control-select
          label="autoplayInterval"
          hint="Milliseconds between automatic slide advances."
          [options]="intervalOptions"
          [(value)]="intervalValue"
        />
        <p class="pg-state">
          playing: <b>{{ car.playing() }}</b
          ><br />
          activeIndex: <b>{{ activeIndex() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .acar-demo {
      width: min(400px, 100%);
    }

    .acar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .acar-rotation-btn {
      appearance: none;
      align-self: flex-start;
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      font-size: 0.9rem;
      cursor: pointer;
    }

    .acar-rotation-btn:hover {
      background: var(--pg-surface-2);
    }

    .acar-rotation-btn::before {
      content: '▶';
    }

    .acar-rotation-btn[data-playing]::before {
      content: '⏸';
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

    .acar-btn:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .acar-btn[disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .acar-viewport {
      overflow: hidden;
      border-radius: var(--pg-radius);
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
      border-radius: var(--pg-radius);
    }

    .acar-slide--1 {
      background: color-mix(in srgb, var(--pg-primary) 20%, var(--pg-surface));
    }
    .acar-slide--2 {
      background: color-mix(in srgb, var(--pg-success) 20%, var(--pg-surface));
    }
    .acar-slide--3 {
      background: color-mix(in srgb, var(--pg-warning) 20%, var(--pg-surface));
    }
    .acar-slide--4 {
      background: color-mix(in srgb, var(--pg-primary) 35%, var(--pg-surface));
    }

    .acar-slide-label {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--pg-text);
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
      background: var(--pg-border-strong);
      padding: 0;
      cursor: pointer;
      transition:
        background 0.2s ease,
        transform 0.2s ease;
    }

    .acar-dot[aria-current='true'] {
      background: var(--pg-primary);
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

  protected readonly intervalOptions: readonly ControlOption[] = [
    { value: '2000', label: '2 s' },
    { value: '3000', label: '3 s' },
    { value: '5000', label: '5 s' },
  ];

  protected readonly activeIndex = signal(0);
  protected readonly autoplayOn = signal(true);

  protected readonly intervalValue = signal('3000');
  protected readonly autoplayInterval = computed(() => Number(this.intervalValue()));
}
