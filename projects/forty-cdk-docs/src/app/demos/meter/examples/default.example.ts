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
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .indicator {
      height: 100%;
      width: var(--for-meter-percentage, 0%);
      border-radius: 999px;
      background: var(--pg-border-strong);
      transition:
        width 0.3s ease,
        background 0.3s ease;
    }

    .indicator[data-quality='optimum'] {
      background: #22c55e;
    }

    .indicator[data-quality='sub-optimum'] {
      background: #f59e0b;
    }

    .indicator[data-quality='even-less-good'] {
      background: #ef4444;
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
