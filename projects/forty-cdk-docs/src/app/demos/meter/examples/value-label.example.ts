import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForMeter, ForMeterIndicator } from 'forty-cdk/meter';

@Component({
  selector: 'app-meter-value-label-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForMeter, ForMeterIndicator],
  template: `
    <div class="disk">
      <div class="head">
        <span class="name">Disk usage</span>
        <span class="label">{{ label(used(), 0, max) }}</span>
      </div>
      <div
        forMeter
        class="track"
        [value]="used()"
        [min]="0"
        [max]="max"
        [low]="low"
        [high]="high"
        [optimum]="optimum"
        [getValueLabel]="label"
        aria-label="Disk usage"
      >
        <div forMeterIndicator class="indicator"></div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .disk {
      width: min(420px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1rem;
    }

    .name {
      font-weight: 600;
    }

    .label {
      font-variant-numeric: tabular-nums;
      color: var(--pg-text-muted);
    }

    .track {
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

    @media (prefers-reduced-motion: reduce) {
      .indicator {
        transition: none;
      }
    }
  `,
})
export class MeterValueLabelExample {
  protected readonly max = 512;
  protected readonly low = 256;
  protected readonly high = 448;
  protected readonly optimum = 128;

  protected readonly used = signal(200);

  protected readonly label = (value: number, _min: number, max: number): string =>
    `${value} GB used · ${max - value} GB free`;
}
