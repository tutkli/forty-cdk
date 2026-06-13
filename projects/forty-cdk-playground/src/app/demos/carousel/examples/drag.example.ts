import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
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
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

interface Slide {
  readonly id: number;
  readonly label: string;
}

@Component({
  selector: 'app-carousel-drag-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForCarousel,
    ForCarouselViewport,
    ForCarouselDrag,
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
      title="Drag / swipe"
      subtitle="Add the opt-in forCarouselDrag directive to the viewport for pointer drag and touch swipe navigation. The track follows the finger 1:1 via the --for-carousel-drag CSS var, then snaps to the nearest slide on release — a fast flick biases toward the flick direction. touch-action is set automatically so the cross axis still scrolls the page."
      sourcePath="projects/forty-cdk-playground/src/app/demos/carousel/examples/drag.example.ts"
    >
      <div demo class="dcar-demo">
        <div
          forCarousel
          class="dcar"
          [(activeIndex)]="activeIndex"
          [loop]="loop()"
          [orientation]="orientation()"
          ariaLabel="Draggable gallery"
          [class.dcar--vertical]="orientation() === 'vertical'"
        >
          <div class="dcar-controls-row">
            <button forCarouselPrevious class="dcar-btn" aria-label="Previous slide">‹</button>
            <button forCarouselNext class="dcar-btn" aria-label="Next slide">›</button>
          </div>

          <div forCarouselViewport forCarouselDrag [disabled]="dragDisabled()" class="dcar-viewport">
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
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="drag disabled"
          hint="Toggle [disabled] on forCarouselDrag without removing the directive."
          [(checked)]="dragDisabled"
        />
        <app-control-switch label="loop" [(checked)]="loop" />
        <app-control-select
          label="orientation"
          [options]="orientationOptions"
          [(value)]="orientationValue"
        />
        <p class="pg-state">
          activeIndex: <b>{{ activeIndex() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .dcar-demo {
      width: min(400px, 100%);
    }

    .dcar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .dcar--vertical {
      flex-direction: row;
      align-items: flex-start;
    }

    .dcar-controls-row {
      display: flex;
      gap: 0.5rem;
    }

    .dcar--vertical .dcar-controls-row {
      flex-direction: column;
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

    .dcar-btn:hover:not([disabled]) {
      background: var(--pg-surface-2);
    }

    .dcar-btn[disabled] {
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

    .dcar--vertical .dcar-viewport {
      height: 180px;
    }

    .dcar-track {
      display: flex;
      transform: translateX(calc(var(--for-carousel-offset) + var(--for-carousel-drag, 0px)));
      transition: transform 300ms ease;
    }

    .dcar[data-orientation='vertical'] .dcar-track {
      flex-direction: column;
      transform: translateY(calc(var(--for-carousel-offset) + var(--for-carousel-drag, 0px)));
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

    .dcar--vertical .dcar-slide {
      min-height: 180px;
    }

    .dcar-slide--1 { background: color-mix(in srgb, var(--pg-primary) 20%, var(--pg-surface)); }
    .dcar-slide--2 { background: color-mix(in srgb, var(--pg-success) 20%, var(--pg-surface)); }
    .dcar-slide--3 { background: color-mix(in srgb, var(--pg-warning) 20%, var(--pg-surface)); }
    .dcar-slide--4 { background: color-mix(in srgb, var(--pg-primary) 35%, var(--pg-surface)); }
    .dcar-slide--5 { background: color-mix(in srgb, var(--pg-success) 35%, var(--pg-surface)); }

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
      transition: background 0.2s ease, transform 0.2s ease;
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

  protected readonly orientationOptions: readonly ControlOption<'horizontal' | 'vertical'>[] = [
    { value: 'horizontal', label: 'horizontal' },
    { value: 'vertical', label: 'vertical' },
  ];

  protected readonly activeIndex = signal(0);
  protected readonly loop = signal(false);
  protected readonly dragDisabled = signal(false);

  protected readonly orientationValue = signal<string>('horizontal');
  protected readonly orientation = computed(
    () => this.orientationValue() as 'horizontal' | 'vertical',
  );
}
