import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSlider, ForSliderRange, ForSliderThumb, ForSliderTrack } from 'forty-cdk/slider';

@Component({
  selector: 'app-slider-steps-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSlider, ForSliderTrack, ForSliderRange, ForSliderThumb],
  template: `
    <div class="sl-demo">
      <div forSlider class="sl" [(value)]="value" [min]="0" [max]="100" [step]="10">
        <span forSliderTrack class="sl-track">
          <span forSliderRange class="sl-range"></span>
          <span forSliderThumb class="sl-thumb" [index]="0" ariaLabel="Brightness"></span>
        </span>
      </div>
      <span class="sl-value">{{ value()[0] }}</span>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

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

    .sl-track {
      position: relative;
      flex: 1;
      height: 6px;
      border-radius: 999px;
      background: var(--ex-border-strong, #d0c9bc);
      cursor: pointer;
    }

    .sl-range {
      position: absolute;
      height: 100%;
      border-radius: 999px;
      background: var(--ex-accent, #0e7c6b);
      inset-inline-start: calc(var(--for-slider-range-start) * 100%);
      width: calc(var(--for-slider-range-size) * 100%);
    }

    .sl-thumb {
      position: absolute;
      top: 50%;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--ex-surface, #ffffff);
      border: 2px solid var(--ex-accent, #0e7c6b);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
      cursor: grab;
      inset-inline-start: calc(var(--for-slider-thumb-position) * 100%);
      transform: translate(-50%, -50%);
      touch-action: none;
    }

    .sl-thumb:active {
      cursor: grabbing;
    }

    .sl-thumb:focus-visible {
      outline: 2px solid var(--ex-accent, #0e7c6b);
      outline-offset: 3px;
    }

    .sl-value {
      min-width: 2.5ch;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
  `,
})
export class SliderStepsExample {
  protected readonly value = signal<readonly number[]>([40]);
}
