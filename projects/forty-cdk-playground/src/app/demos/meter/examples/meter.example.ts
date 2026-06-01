import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForMeter, ForMeterIndicator } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-meter-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForMeter, ForMeterIndicator],
  template: `
    <playground-demo
      title="Quality thresholds"
      subtitle="A scalar measurement inside a known range — think battery, disk or a score. Unlike Progress it is not about a task finishing: it reflects data-quality (optimum / sub-optimum / even-less-good) from the low / high / optimum thresholds."
      sourcePath="projects/forty-cdk-playground/src/app/demos/meter/examples/meter.example.ts"
    >
      <div demo class="mt-demo">
        <div
          forMeter
          class="mt-track"
          [value]="value()"
          [min]="0"
          [max]="100"
          [low]="low"
          [high]="high"
          [optimum]="optimum"
        >
          <div forMeterIndicator class="mt-indicator"></div>
        </div>
        <span class="mt-value">{{ value() }}%</span>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="step(-10)">-10</button>
          <button type="button" class="pg-btn" (click)="step(10)">+10</button>
        </div>

        <p class="pg-state">
          value: <b>{{ value() }}</b
          ><br />
          quality: <b>{{ quality() }}</b
          ><br />
          thresholds: <b>low {{ low }} · high {{ high }} · optimum {{ optimum }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .mt-demo {
      width: min(380px, 100%);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .mt-track {
      flex: 1;
      height: 14px;
      border-radius: 999px;
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .mt-indicator {
      height: 100%;
      width: var(--for-meter-percentage, 0%);
      border-radius: 999px;
      background: var(--pg-border-strong);
      transition:
        width 0.3s ease,
        background 0.3s ease;
    }

    .mt-indicator[data-quality='optimum'] {
      background: #22c55e;
    }

    .mt-indicator[data-quality='sub-optimum'] {
      background: #f59e0b;
    }

    .mt-indicator[data-quality='even-less-good'] {
      background: #ef4444;
    }

    .mt-value {
      min-width: 3.5ch;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      text-align: right;
    }

    @media (prefers-reduced-motion: reduce) {
      .mt-indicator {
        transition: none;
      }
    }
  `,
})
export class MeterExample {
  protected readonly low = 33;
  protected readonly high = 66;
  protected readonly optimum = 90;

  protected readonly value = signal(72);

  protected readonly quality = computed<'optimum' | 'sub-optimum' | 'even-less-good'>(() => {
    const region = (n: number): number => (n <= this.low ? 0 : n >= this.high ? 2 : 1);
    const distance = Math.abs(region(this.value()) - region(this.optimum));
    return distance === 0 ? 'optimum' : distance === 1 ? 'sub-optimum' : 'even-less-good';
  });

  protected step(delta: number): void {
    this.value.update((current) => Math.min(100, Math.max(0, current + delta)));
  }
}
