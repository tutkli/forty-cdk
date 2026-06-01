import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForSlider, ForSliderRange, ForSliderThumb, ForSliderTrack } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-slider-example',
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
      title="Drag & keyboard"
      subtitle="Drag the thumb, click the track, or focus it and use arrows / PageUp-Down / Home-End. The directive exposes the live position as CSS custom properties; this demo paints the track, range and thumb with pure CSS."
      sourcePath="projects/forty-cdk-playground/src/app/demos/slider/examples/slider.example.ts"
    >
      <div demo class="sl-demo">
        <div
          forSlider
          class="sl"
          [(value)]="value"
          [min]="0"
          [max]="100"
          [step]="step()"
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
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-select
          label="step"
          hint="The granularity values snap to, and the amount each arrow-key press moves. PageUp / PageDown move by 10× this step."
          [options]="stepOptions"
          [(value)]="stepValue"
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
      min-width: 2.5ch;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
  `,
})
export class SliderExample {
  protected readonly stepOptions: readonly ControlOption[] = [
    { value: '1', label: '1' },
    { value: '5', label: '5' },
    { value: '10', label: '10' },
  ];

  protected readonly value = signal<readonly number[]>([40]);
  protected readonly stepValue = signal('1');
  protected readonly step = computed(() => Number(this.stepValue()));
  protected readonly disabled = signal(false);
}
