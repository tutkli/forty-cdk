import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForMeter, ForMeterIndicator } from 'forty-cdk/meter';

@Component({
  selector: 'app-meter-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForMeter, ForMeterIndicator],
  template: `
    <div class="row">
      <div
        forMeter
        class="track"
        [value]="value()"
        [min]="0"
        [max]="100"
        [low]="33"
        [high]="66"
        [optimum]="90"
        aria-label="Battery level"
      >
        <div forMeterIndicator class="indicator"></div>
      </div>
      <span class="value">{{ value() }}%</span>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .row {
      width: min(380px, 100%);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .track {
      flex: 1;
      height: 14px;
      border-radius: 999px;
      background: var(--ex-border-strong, #d0c9bc);
      overflow: hidden;
    }

    .indicator {
      height: 100%;
      width: var(--for-meter-percentage, 0%);
      border-radius: 999px;
      background: var(--ex-accent, #0e7c6b);
      transition:
        width 0.3s ease,
        background 0.3s ease;
    }

    .indicator[data-quality='optimum'] {
      background: var(--ex-success, #1f7a4d);
    }

    .indicator[data-quality='sub-optimum'] {
      background: var(--ex-warning, #a5651a);
    }

    .indicator[data-quality='even-less-good'] {
      background: var(--ex-danger, #b3261e);
    }

    .value {
      min-width: 3.5ch;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      text-align: right;
    }

    @media (prefers-reduced-motion: reduce) {
      .indicator {
        transition: none;
      }
    }
  `,
})
export class MeterDefaultExample {
  protected readonly value = signal(72);
}
