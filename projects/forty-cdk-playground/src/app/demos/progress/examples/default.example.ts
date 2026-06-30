import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForProgress, ForProgressIndicator } from 'forty-cdk/progress';

@Component({
  selector: 'app-progress-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForProgress, ForProgressIndicator],
  template: `
    <div class="row">
      <div forProgress class="track" [value]="value()" [max]="100" announceCompletion>
        <div forProgressIndicator class="indicator"></div>
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
export class ProgressDefaultExample {
  protected readonly value = signal(60);
}
