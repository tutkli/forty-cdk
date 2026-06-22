import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSlider, ForSliderRange, ForSliderThumb, ForSliderTrack } from 'forty-cdk/slider';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-slider-inverted-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForSlider, ForSliderTrack, ForSliderRange, ForSliderThumb, ControlSwitch],
  template: `
    <playground-demo
      title="Inverted"
      subtitle="inverted flips the value-to-position mapping — in horizontal LTR, max sits on the left. The flip is baked into the exposed fractions, so the same CSS paints both ways with no consumer math. Keyboard semantics are unchanged: ArrowRight / ArrowUp still move toward max regardless of the visual flip. Toggle it and watch the fill grow from the right."
      sourcePath="projects/forty-cdk-playground/src/app/demos/slider/examples/inverted.example.ts"
    >
      <div demo class="sl-demo">
        <div
          forSlider
          class="sl"
          [(value)]="value"
          [min]="0"
          [max]="100"
          [inverted]="inverted()"
          [disabled]="disabled()"
        >
          <span forSliderTrack class="sl-track">
            <span forSliderRange class="sl-range"></span>
            <span forSliderThumb class="sl-thumb" [index]="0" label="Volume"></span>
          </span>
        </div>
        <span class="sl-value">{{ value()[0] }}</span>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="inverted" [(checked)]="inverted" />
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          value: <b>{{ value().join(', ') }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .sl-demo {
      width: min(360px, 100%);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .sl {
      flex: 1;
      display: flex;
      align-items: center;
      min-height: 24px;
    }

    .sl[data-disabled] {
      opacity: 0.5;
    }

    .sl-track {
      position: relative;
      flex: 1;
      height: 6px;
      border-radius: 999px;
      background: var(--pg-surface-2);
      cursor: pointer;
    }

    .sl-range {
      position: absolute;
      height: 100%;
      border-radius: 999px;
      background: var(--pg-primary);
      inset-inline-start: calc(var(--for-slider-range-start) * 100%);
      width: calc(var(--for-slider-range-size) * 100%);
    }

    .sl-thumb {
      position: absolute;
      top: 50%;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--pg-surface);
      border: 2px solid var(--pg-primary);
      box-shadow: var(--pg-shadow);
      cursor: grab;
      inset-inline-start: calc(var(--for-slider-thumb-position) * 100%);
      transform: translate(-50%, -50%);
      touch-action: none;
    }

    .sl-thumb:active {
      cursor: grabbing;
    }

    .sl-thumb:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: 3px;
    }

    .sl-value {
      min-width: 2.5ch;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
  `,
})
export class SliderInvertedExample {
  protected readonly value = signal<readonly number[]>([40]);
  protected readonly inverted = signal(true);
  protected readonly disabled = signal(false);
}
