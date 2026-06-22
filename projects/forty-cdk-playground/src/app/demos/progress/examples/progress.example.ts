import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForProgress, ForProgressIndicator } from 'forty-cdk/progress';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-progress-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForProgress, ForProgressIndicator, ControlSwitch],
  template: `
    <playground-demo
      title="Loading bar"
      subtitle="A determinate or indeterminate progress bar. The directive exposes the live percentage as a CSS custom property and reflects data-state (loading → complete); switching value to null enters indeterminate mode."
      sourcePath="projects/forty-cdk-playground/src/app/demos/progress/examples/progress.example.ts"
    >
      <div demo class="pr-demo">
        <div
          forProgress
          class="pr-track"
          [value]="indeterminate() ? null : value()"
          [max]="100"
          [announceCompletion]="announce()"
        >
          <div forProgressIndicator class="pr-indicator"></div>
        </div>
        <span class="pr-value">{{ indeterminate() ? '…' : value() + '%' }}</span>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" [disabled]="indeterminate()" (click)="step(-10)">
            -10
          </button>
          <button type="button" class="pg-btn" [disabled]="indeterminate()" (click)="step(10)">
            +10
          </button>
          <button
            type="button"
            class="pg-btn"
            [disabled]="indeterminate()"
            (click)="value.set(100)"
          >
            Complete
          </button>
        </div>
        <app-control-switch
          label="indeterminate"
          hint="Sets value to null, putting the bar in indeterminate mode (no aria-valuenow). Use it for loading states whose duration cannot be predicted."
          [(checked)]="indeterminate"
        />
        <app-control-switch
          label="announceCompletion"
          hint="When on, reaching the max value is announced once via the live region using aria-valuetext (or 'Complete'). Repeated completions do not re-fire."
          [(checked)]="announce"
        />

        <p class="pg-state">
          value: <b>{{ indeterminate() ? 'null' : value() }}</b
          ><br />
          state: <b>{{ state() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .pr-demo {
      width: min(380px, 100%);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .pr-track {
      flex: 1;
      height: 10px;
      border-radius: 999px;
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .pr-indicator {
      height: 100%;
      width: var(--for-progress-percentage, 0%);
      border-radius: 999px;
      background: var(--pg-primary);
      transition: width 0.3s ease;
    }

    .pr-indicator[data-state='complete'] {
      background: #22c55e;
    }

    .pr-indicator[data-state='indeterminate'] {
      width: 40%;
      transition: none;
      animation: pr-indef 1.2s ease-in-out infinite;
    }

    @keyframes pr-indef {
      0% {
        transform: translateX(-110%);
      }
      100% {
        transform: translateX(320%);
      }
    }

    .pr-value {
      min-width: 3.5ch;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      text-align: right;
    }

    @media (prefers-reduced-motion: reduce) {
      .pr-indicator {
        transition: none;
      }

      .pr-indicator[data-state='indeterminate'] {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ProgressExample {
  protected readonly value = signal(30);
  protected readonly indeterminate = signal(false);
  protected readonly announce = signal(false);

  protected readonly state = computed<'indeterminate' | 'loading' | 'complete'>(() => {
    if (this.indeterminate()) {
      return 'indeterminate';
    }
    return this.value() >= 100 ? 'complete' : 'loading';
  });

  protected step(delta: number): void {
    this.value.update((current) => Math.min(100, Math.max(0, current + delta)));
  }
}
