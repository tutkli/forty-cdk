import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSlider, ForSliderRange, ForSliderThumb, ForSliderTrack } from 'forty-cdk/slider';

@Component({
  selector: 'app-slider-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSlider, ForSliderTrack, ForSliderRange, ForSliderThumb],
  template: `
    <div class="sl-demo">
      <div forSlider class="sl" [(value)]="value" [min]="0" [max]="100">
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
export class SliderDefaultExample {
  protected readonly value = signal<readonly number[]>([40]);
}
