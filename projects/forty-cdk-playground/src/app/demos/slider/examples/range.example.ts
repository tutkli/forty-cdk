import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForSlider, ForSliderRange, ForSliderThumb, ForSliderTrack } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-slider-range-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForSlider,
    ForSliderTrack,
    ForSliderRange,
    ForSliderThumb,
    ControlSwitch,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Range (two thumbs)"
      subtitle="The value model is a readonly number[]; two forSliderThumb pieces, one per index, make a range. Each thumb's aria-valuemin / aria-valuemax automatically squeeze to its neighbor, so the thumbs can't cross. minStepsBetweenThumbs keeps a minimum gap between them, in step units."
      sourcePath="projects/forty-cdk-playground/src/app/demos/slider/examples/range.example.ts"
    >
      <div demo class="sl-demo">
        <div
          forSlider
          class="sl"
          [(value)]="value"
          [min]="0"
          [max]="1000"
          [step]="10"
          [minStepsBetweenThumbs]="gap()"
          [disabled]="disabled()"
        >
          <span forSliderTrack class="sl-track">
            <span forSliderRange class="sl-range"></span>
            <span forSliderThumb class="sl-thumb" [index]="0" label="Minimum price"></span>
            <span forSliderThumb class="sl-thumb" [index]="1" label="Maximum price"></span>
          </span>
        </div>
        <span class="sl-value">{{ value()[0] }}–{{ value()[1] }}</span>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-select
          label="minStepsBetweenThumbs"
          hint="Minimum gap between adjacent thumbs, in step units. With step 10, a value of 2 forces the thumbs at least 20 apart."
          [options]="gapOptions"
          [(value)]="gapValue"
        />

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
      min-width: 6ch;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
  `,
})
export class SliderRangeExample {
  protected readonly gapOptions: readonly ControlOption[] = [
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
  ];

  protected readonly value = signal<readonly number[]>([200, 800]);
  protected readonly gapValue = signal('1');
  protected readonly gap = computed(() => Number(this.gapValue()));
  protected readonly disabled = signal(false);
}
