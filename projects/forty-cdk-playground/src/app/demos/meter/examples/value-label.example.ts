import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForMeter, ForMeterIndicator } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-meter-value-label-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForMeter, ForMeterIndicator],
  template: `
    <playground-demo
      title="Custom value label"
      subtitle="getValueLabel receives the clamped value, min and max and returns the aria-valuetext, so AT announces 'Disk: 200 GB used · 312 GB free' instead of the bare number. Here the thresholds put optimum below low, so usage stays green while it is low and turns amber, then red as the disk fills."
      sourcePath="projects/forty-cdk-playground/src/app/demos/meter/examples/value-label.example.ts"
    >
      <div demo class="vl-demo">
        <div class="vl-head">
          <span class="vl-name">Disk usage</span>
          <span class="vl-label">{{ label(used(), 0, max) }}</span>
        </div>
        <div
          forMeter
          class="vl-track"
          [value]="used()"
          [min]="0"
          [max]="max"
          [low]="low"
          [high]="high"
          [optimum]="optimum"
          [getValueLabel]="label"
        >
          <div forMeterIndicator class="vl-indicator"></div>
        </div>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="step(-64)">-64 GB</button>
          <button type="button" class="pg-btn" (click)="step(64)">+64 GB</button>
        </div>

        <p class="pg-state">
          value: <b>{{ used() }}</b
          ><br />
          quality: <b>{{ quality() }}</b
          ><br />
          aria-valuetext: <b>{{ label(used(), 0, max) }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .vl-demo {
      width: min(420px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .vl-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1rem;
    }

    .vl-name {
      font-weight: 600;
    }

    .vl-label {
      font-variant-numeric: tabular-nums;
      color: var(--pg-text-muted);
    }

    .vl-track {
      height: 14px;
      border-radius: 999px;
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .vl-indicator {
      height: 100%;
      width: var(--for-meter-percentage, 0%);
      border-radius: 999px;
      background: var(--pg-border-strong);
      transition:
        width 0.3s ease,
        background 0.3s ease;
    }

    .vl-indicator[data-quality='optimum'] {
      background: #22c55e;
    }

    .vl-indicator[data-quality='sub-optimum'] {
      background: #f59e0b;
    }

    .vl-indicator[data-quality='even-less-good'] {
      background: #ef4444;
    }

    @media (prefers-reduced-motion: reduce) {
      .vl-indicator {
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

  protected readonly quality = computed<'optimum' | 'sub-optimum' | 'even-less-good'>(() => {
    const v = this.used();
    if (v < this.low) return 'optimum';
    if (v <= this.high) return 'sub-optimum';
    return 'even-less-good';
  });

  protected step(delta: number): void {
    this.used.update((current) => Math.min(this.max, Math.max(0, current + delta)));
  }
}
