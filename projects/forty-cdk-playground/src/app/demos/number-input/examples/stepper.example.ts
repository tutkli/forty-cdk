import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-number-input-stepper-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSwitch,
    Icon,
    ForNumberInputGroup,
    ForNumberInput,
    ForNumberInputIncrement,
    ForNumberInputDecrement,
  ],
  template: `
    <playground-demo
      title="Stepper"
      subtitle="The input is a role=spinbutton with aria-valuenow / valuemin / valuemax. ArrowUp / ArrowDown step by [step], PageUp / PageDown step by the multiplier, and Home / End jump to the bounds. The group wires the +/− buttons, which auto-disable (data-disabled) once the value reaches min or max."
      sourcePath="projects/forty-cdk-playground/src/app/demos/number-input/examples/stepper.example.ts"
    >
      <div demo>
        <div forNumberInputGroup class="stepper">
          <button forNumberInputDecrement class="step-btn" ariaLabel="Decrease">
            <span class="glyph">−</span>
          </button>
          <input
            forNumberInput
            class="step-input"
            [(value)]="qty"
            [min]="0"
            [max]="10"
            [step]="1"
            [disabled]="disabled()"
            [readonly]="readonly()"
          />
          <button forNumberInputIncrement class="step-btn" ariaLabel="Increase">
            <app-icon name="chevron-down" />
          </button>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-switch
          label="readonly"
          hint="The spinbutton stays focusable but ignores the keyboard and the +/− buttons."
          [(checked)]="readonly"
        />
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="clear()">Clear</button>
        </div>
        <p class="pg-state">
          value: <b>{{ qty() ?? 'null' }}</b
          ><br />
          range: <b>0 – 10</b><br />
          at min: <b>{{ atMin() }}</b
          ><br />
          at max: <b>{{ atMax() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .stepper {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      overflow: hidden;
    }

    .step-input {
      width: 4rem;
      font: inherit;
      font-size: 1rem;
      font-variant-numeric: tabular-nums;
      text-align: center;
      padding: 0.5rem 0;
      border: 0;
      background: transparent;
      color: var(--pg-text);
    }

    .step-input:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .step-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.4rem;
      height: 2.4rem;
      border: 0;
      background: var(--pg-surface-2);
      color: var(--pg-text);
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }

    .step-btn app-icon {
      width: 16px;
      height: 16px;
      transform: rotate(180deg);
    }

    .step-btn:hover:not([data-disabled]) {
      background: var(--pg-border-strong);
    }

    .step-btn[data-disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `,
})
export class NumberInputStepperExample {
  protected readonly qty = signal<number | null>(1);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);

  protected readonly atMin = computed(() => this.qty() !== null && this.qty()! <= 0);
  protected readonly atMax = computed(() => this.qty() !== null && this.qty()! >= 10);

  protected clear(): void {
    this.qty.set(null);
  }
}
