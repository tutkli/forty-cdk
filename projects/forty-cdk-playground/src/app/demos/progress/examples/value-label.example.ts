import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForProgress, ForProgressIndicator } from 'forty-cdk/progress';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-progress-value-label-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForProgress, ForProgressIndicator],
  template: `
    <playground-demo
      title="Custom value label"
      subtitle="getValueLabel maps the raw value and max to a human string used for aria-valuetext, so screen readers announce '42 MB of 200 MB' instead of a bare '21'. The same function feeds the visible caption here, keeping what is seen and what is announced in sync."
      sourcePath="projects/forty-cdk-playground/src/app/demos/progress/examples/value-label.example.ts"
    >
      <div demo class="vl-demo">
        <div class="vl-head">
          <span class="vl-file">project-assets.zip</span>
          <span class="vl-label">{{ label(uploaded(), total) }}</span>
        </div>
        <div
          forProgress
          class="vl-track"
          [value]="uploaded()"
          [max]="total"
          [getValueLabel]="label"
        >
          <div forProgressIndicator class="vl-indicator"></div>
        </div>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="step(-25)">-25 MB</button>
          <button type="button" class="pg-btn" (click)="step(25)">+25 MB</button>
          <button type="button" class="pg-btn" (click)="uploaded.set(total)">Finish</button>
        </div>

        <p class="pg-state">
          value: <b>{{ uploaded() }}</b
          ><br />
          aria-valuetext: <b>{{ label(uploaded(), total) }}</b>
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

    .vl-file {
      font-weight: 600;
    }

    .vl-label {
      font-variant-numeric: tabular-nums;
      color: var(--pg-text-muted);
    }

    .vl-track {
      height: 10px;
      border-radius: 999px;
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .vl-indicator {
      height: 100%;
      width: var(--for-progress-percentage, 0%);
      border-radius: 999px;
      background: var(--pg-primary);
      transition: width 0.3s ease;
    }

    .vl-indicator[data-state='complete'] {
      background: #22c55e;
    }

    @media (prefers-reduced-motion: reduce) {
      .vl-indicator {
        transition: none;
      }
    }
  `,
})
export class ProgressValueLabelExample {
  protected readonly total = 200;
  protected readonly uploaded = signal(50);

  protected readonly label = (value: number, max: number): string => `${value} MB of ${max} MB`;

  protected step(delta: number): void {
    this.uploaded.update((current) => Math.min(this.total, Math.max(0, current + delta)));
  }
}
