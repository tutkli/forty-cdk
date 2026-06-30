import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForStepper,
  ForStepperCompletedContent,
  ForStepperContent,
  ForStepperIndicator,
  ForStepperItem,
  ForStepperList,
  ForStepperNext,
  ForStepperPrevious,
  ForStepperSeparator,
  ForStepperTrigger,
} from 'forty-cdk/stepper';

interface Step {
  readonly label: string;
  readonly body: string;
}

@Component({
  selector: 'app-stepper-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperIndicator,
    ForStepperSeparator,
    ForStepperContent,
    ForStepperCompletedContent,
    ForStepperNext,
    ForStepperPrevious,
  ],
  template: `
    <div class="stp-demo">
      <div forStepper class="stp" [(selectedIndex)]="step">
        <ol forStepperList class="stp-list" ariaLabel="Checkout">
          @for (s of steps; track s.label; let i = $index; let last = $last) {
            <li forStepperItem #item="forStepperItem" class="stp-item" [completed]="step() > i">
              <button forStepperTrigger type="button" class="stp-trigger">
                <span forStepperIndicator class="stp-indicator">
                  @if (item.resolvedState() === 'completed') {
                    ✓
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
                <span class="stp-label">{{ s.label }}</span>
              </button>
              @if (!last) {
                <span forStepperSeparator class="stp-sep"></span>
              }
            </li>
          }
        </ol>

        <div class="stp-body">
          @for (s of steps; track s.label) {
            <section forStepperContent class="stp-panel">
              <p>{{ s.body }}</p>
            </section>
          }
          <section forStepperCompletedContent class="stp-panel stp-complete">
            <p>🎉 All steps complete — your order is placed.</p>
            <button type="button" class="btn" (click)="restart()">Start over</button>
          </section>

          <div class="stp-nav">
            <button forStepperPrevious type="button" class="btn">Back</button>
            <button forStepperNext type="button" class="btn btn-next">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stp-demo {
      width: min(560px, 100%);
    }

    .stp {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stp-list {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .stp-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .stp-item:not(:last-child) {
      flex: 1;
    }

    .stp-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      font: inherit;
      padding: 0.3rem;
      background: transparent;
      border: 0;
      border-radius: var(--pg-radius-sm);
      color: var(--pg-text-muted);
      cursor: pointer;
      white-space: nowrap;
    }

    .stp-trigger[aria-disabled='true'] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .stp-trigger[data-state='active'],
    .stp-trigger[data-state='completed'] {
      color: var(--pg-text);
    }

    .stp-trigger[data-state='error'] {
      color: var(--pg-danger);
    }

    .stp-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 50%;
      border: 2px solid var(--pg-border-strong);
      background: var(--pg-surface);
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--pg-text-muted);
    }

    .stp-indicator[data-state='active'] {
      border-color: var(--pg-primary);
      color: var(--pg-primary);
    }

    .stp-indicator[data-state='completed'] {
      border-color: var(--pg-primary);
      background: var(--pg-primary);
      color: var(--pg-on-primary, #fff);
    }

    .stp-label {
      font-size: 0.92rem;
      font-weight: 600;
    }

    .stp-sep {
      flex: 1;
      height: 2px;
      min-width: 1rem;
      border-radius: 2px;
      background: var(--pg-border);
    }

    .stp-sep[data-state='completed'] {
      background: var(--pg-primary);
    }

    .stp-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 0;
    }

    .stp-panel {
      min-height: 3rem;
      color: var(--pg-text-muted);
    }

    .stp-panel[data-state='inactive'] {
      display: none;
    }

    .stp-panel p {
      margin: 0 0 0.75rem;
    }

    .stp-complete {
      color: var(--pg-text);
    }

    .stp-nav {
      display: flex;
      gap: 0.6rem;
    }

    .btn {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .btn:hover {
      background: var(--pg-surface-2);
    }

    .btn[aria-disabled='true'] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .btn-next {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-on-primary, #fff);
    }
  `,
})
export class StepperDefaultExample {
  protected readonly steps: readonly Step[] = [
    { label: 'Shipping', body: 'Where should we send your order? Enter a delivery address.' },
    { label: 'Payment', body: 'Add a card or pick a saved payment method.' },
    { label: 'Review', body: 'Check everything looks right, then place the order.' },
  ];

  protected readonly step = signal(0);

  protected restart(): void {
    this.step.set(0);
  }
}
