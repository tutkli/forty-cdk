import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForProgress, ForProgressIndicator } from 'forty-cdk/progress';

@Component({
  selector: 'app-progress-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForProgress, ForProgressIndicator],
  template: `
    <div class="stack">
      <div class="row">
        <div forProgress class="track" [value]="value()" [max]="100" announceCompletion>
          <div forProgressIndicator class="indicator"></div>
        </div>
        <span class="value">{{ value() }}%</span>
      </div>
      <button type="button" class="btn" (click)="advance()">
        {{ value() === 100 ? 'Restart' : 'Advance' }}
      </button>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stack {
      width: min(380px, 100%);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.9rem;
    }

    .row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .track {
      flex: 1;
      height: 10px;
      border-radius: 999px;
      background: var(--ex-border-strong, #d0c9bc);
      overflow: hidden;
    }

    .indicator {
      height: 100%;
      width: var(--for-progress-percentage, 0%);
      border-radius: 999px;
      background: var(--ex-accent, #0e7c6b);
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

    .btn {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .btn:hover {
      background: var(--ex-surface-2, #f2eee6);
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

  protected advance(): void {
    this.value.update((value) => (value === 100 ? 0 : Math.min(100, value + 20)));
  }
}
