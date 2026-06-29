import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForProgress, ForProgressIndicator } from 'forty-cdk/progress';

@Component({
  selector: 'app-progress-indeterminate-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForProgress, ForProgressIndicator],
  template: `
    <div class="row">
      <div forProgress class="track" [value]="null" [max]="100">
        <div forProgressIndicator class="indicator"></div>
      </div>
      <span class="value">…</span>
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
    }

    .indicator[data-state='indeterminate'] {
      width: 40%;
      animation: progress-indef 1.2s ease-in-out infinite;
    }

    @keyframes progress-indef {
      0% {
        transform: translateX(-110%);
      }
      100% {
        transform: translateX(320%);
      }
    }

    .value {
      min-width: 3.5ch;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      text-align: right;
    }

    @media (prefers-reduced-motion: reduce) {
      .indicator[data-state='indeterminate'] {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ProgressIndeterminateExample {}
