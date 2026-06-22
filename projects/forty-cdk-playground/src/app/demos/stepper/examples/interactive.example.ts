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

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

interface Step {
  readonly label: string;
  readonly body: string;
}

@Component({
  selector: 'app-stepper-interactive-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
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
    ControlSwitch,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Interactive wizard"
      subtitle="The WAI-ARIA Tabs pattern: roving tabindex over the triggers, arrow keys / Home / End to move focus, and a content panel per step. Indicators reflect each step's data-state. Pressing Next on the last step advances one past it into the terminal completed state, which fires (complete) once and reveals the forStepperCompletedContent panel."
      sourcePath="projects/forty-cdk-playground/src/app/demos/stepper/examples/interactive.example.ts"
    >
      <div demo class="stp-demo">
        <div
          forStepper
          #stepper="forStepper"
          class="stp"
          [(selectedIndex)]="step"
          [orientation]="orientation()"
          [activationMode]="activationMode()"
          [disabled]="disabled()"
          (complete)="onComplete()"
        >
          <ol forStepperList class="stp-list" ariaLabel="Checkout">
            @for (s of steps; track s.label; let i = $index; let last = $last) {
              <li
                forStepperItem
                #item="forStepperItem"
                class="stp-item"
                [completed]="step() > i"
                [hasError]="i === 1 && paymentError()"
              >
                <button forStepperTrigger type="button" class="stp-trigger">
                  <span forStepperIndicator class="stp-indicator">
                    @if (item.resolvedState() === 'completed') {
                      ✓
                    } @else if (item.resolvedState() === 'error') {
                      !
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
              <button type="button" class="pg-btn" (click)="restart()">Start over</button>
            </section>

            <div class="stp-nav">
              <button forStepperPrevious type="button" class="pg-btn">Back</button>
              <button forStepperNext type="button" class="pg-btn stp-next">Next</button>
            </div>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="orientation"
          hint="Layout axis. horizontal lays the steps in a row and uses ArrowLeft / ArrowRight; vertical stacks them and uses ArrowUp / ArrowDown."
          [options]="orientationOptions"
          [(value)]="orientation"
        />
        <app-control-select
          label="activationMode"
          hint="automatic: arrow keys move focus and select the step. manual: arrows only move focus; Space or Enter selects — recommended for wizards where activation triggers validation."
          [options]="activationOptions"
          [(value)]="activationMode"
        />
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-switch
          label="error on Payment"
          hint="Marks the Payment step with hasError. The error data-state shows on the indicator while that step is not the current one."
          [(checked)]="paymentError"
        />

        <p class="pg-state">
          selectedIndex: <b>{{ step() }}</b
          ><br />
          isCompleted: <b>{{ stepper.isCompleted() }}</b
          ><br />
          (complete) fired: <b>{{ completeCount() }}×</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .stp-demo {
      width: min(560px, 100%);
    }

    .stp {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stp[data-orientation='vertical'] {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 1.75rem;
      align-items: start;
    }

    .stp-list {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .stp[data-orientation='vertical'] .stp-list {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
    }

    .stp-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .stp-item:not(:last-child) {
      flex: 1;
    }

    .stp[data-orientation='vertical'] .stp-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0;
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

    .stp-indicator[data-state='error'] {
      border-color: var(--pg-danger);
      background: var(--pg-danger);
      color: #fff;
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

    .stp[data-orientation='vertical'] .stp-sep {
      width: 2px;
      height: 1.4rem;
      min-width: 0;
      margin-inline-start: 0.95rem;
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

    .stp-next {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-on-primary, #fff);
    }

    .pg-btn[aria-disabled='true'] {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `,
})
export class StepperInteractiveExample {
  protected readonly steps: readonly Step[] = [
    { label: 'Shipping', body: 'Where should we send your order? Enter a delivery address.' },
    { label: 'Payment', body: 'Add a card or pick a saved payment method.' },
    { label: 'Review', body: 'Check everything looks right, then place the order.' },
  ];

  protected readonly orientationOptions: readonly ControlOption<'horizontal' | 'vertical'>[] = [
    { value: 'horizontal', label: 'horizontal' },
    { value: 'vertical', label: 'vertical' },
  ];

  protected readonly activationOptions: readonly ControlOption<'automatic' | 'manual'>[] = [
    { value: 'automatic', label: 'automatic' },
    { value: 'manual', label: 'manual' },
  ];

  protected readonly step = signal(0);
  protected readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  protected readonly activationMode = signal<'automatic' | 'manual'>('manual');
  protected readonly disabled = signal(false);
  protected readonly paymentError = signal(false);
  protected readonly completeCount = signal(0);

  protected onComplete(): void {
    this.completeCount.update((n) => n + 1);
  }

  protected restart(): void {
    this.step.set(0);
  }
}
