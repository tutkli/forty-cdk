import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSlider, ForSliderRange, ForSliderThumb, ForSliderTrack } from 'forty-cdk/slider';

@Component({
  selector: 'app-slider-vertical-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSlider, ForSliderTrack, ForSliderRange, ForSliderThumb],
  template: `
    <div class="sl-demo">
      <div forSlider class="sl" orientation="vertical" [(value)]="value" [min]="0" [max]="100">
        <span forSliderTrack class="sl-track">
          <span forSliderRange class="sl-range"></span>
          <span forSliderThumb class="sl-thumb" [index]="0" ariaLabel="Volume"></span>
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
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 1rem 0;
    }

    .sl {
      display: flex;
      justify-content: center;
      height: 200px;
    }

    .sl-track {
      position: relative;
      width: 6px;
      height: 100%;
      border-radius: 999px;
      background: var(--pg-surface-2);
      cursor: pointer;
    }

    .sl-range {
      position: absolute;
      width: 100%;
      border-radius: 999px;
      background: var(--pg-primary);
      bottom: calc(var(--for-slider-range-start) * 100%);
      height: calc(var(--for-slider-range-size) * 100%);
    }

    .sl-thumb {
      position: absolute;
      left: 50%;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--pg-surface);
      border: 2px solid var(--pg-primary);
      box-shadow: var(--pg-shadow);
      cursor: grab;
      bottom: calc(var(--for-slider-thumb-position) * 100%);
      transform: translate(-50%, 50%);
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
export class SliderVerticalExample {
  protected readonly value = signal<readonly number[]>([40]);
}
