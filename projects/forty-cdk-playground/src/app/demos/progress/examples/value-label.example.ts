import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForProgress, ForProgressIndicator } from 'forty-cdk/progress';

@Component({
  selector: 'app-progress-value-label-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForProgress, ForProgressIndicator],
  template: `
    <div class="upload">
      <div class="head">
        <span class="file">project-assets.zip</span>
        <span class="label">{{ label(uploaded(), total) }}</span>
      </div>
      <div forProgress class="track" [value]="uploaded()" [max]="total" [getValueLabel]="label">
        <div forProgressIndicator class="indicator"></div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .upload {
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

    .file {
      font-weight: 600;
    }

    .label {
      font-variant-numeric: tabular-nums;
      color: var(--pg-text-muted);
    }

    .track {
      height: 10px;
      border-radius: 999px;
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .indicator {
      height: 100%;
      width: var(--for-progress-percentage, 0%);
      border-radius: 999px;
      background: var(--pg-primary);
      transition: width 0.3s ease;
    }

    .indicator[data-state='complete'] {
      background: #22c55e;
    }

    @media (prefers-reduced-motion: reduce) {
      .indicator {
        transition: none;
      }
    }
  `,
})
export class ProgressValueLabelExample {
  protected readonly total = 200;
  protected readonly uploaded = signal(84);

  protected readonly label = (value: number, max: number): string => `${value} MB of ${max} MB`;
}
