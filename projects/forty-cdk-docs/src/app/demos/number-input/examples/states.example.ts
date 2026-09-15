import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';

@Component({
  selector: 'app-number-input-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  template: `
    <div class="states">
      <div class="state">
        <span class="state-label">Default</span>
        <div forNumberInputGroup class="stepper">
          <button forNumberInputDecrement class="step-btn" ariaLabel="Decrease">−</button>
          <input
            forNumberInput
            class="step-input"
            [(value)]="qty"
            [min]="0"
            [max]="10"
            [step]="1"
          />
          <button forNumberInputIncrement class="step-btn" ariaLabel="Increase">+</button>
        </div>
      </div>

      <div class="state">
        <span class="state-label">Disabled</span>
        <div forNumberInputGroup class="stepper">
          <button forNumberInputDecrement class="step-btn" ariaLabel="Decrease">−</button>
          <input
            forNumberInput
            class="step-input"
            disabled
            [(value)]="qty"
            [min]="0"
            [max]="10"
            [step]="1"
          />
          <button forNumberInputIncrement class="step-btn" ariaLabel="Increase">+</button>
        </div>
      </div>

      <div class="state">
        <span class="state-label">Read-only</span>
        <div forNumberInputGroup class="stepper">
          <button forNumberInputDecrement class="step-btn" ariaLabel="Decrease">−</button>
          <input
            forNumberInput
            class="step-input"
            readonly
            [(value)]="qty"
            [min]="0"
            [max]="10"
            [step]="1"
          />
          <button forNumberInputIncrement class="step-btn" ariaLabel="Increase">+</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .states {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 1.8rem;
    }

    .state {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .state-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--pg-text-muted);
    }

    .stepper {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      overflow: hidden;
    }

    .stepper:has(.step-input[data-disabled]) {
      opacity: 0.55;
    }

    .stepper:has(.step-input[data-readonly]) {
      border-style: dashed;
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

    .step-input[data-disabled] {
      cursor: not-allowed;
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

    .step-btn:hover:not([data-disabled]) {
      background: var(--pg-border-strong);
    }

    .step-btn[data-disabled] {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `,
})
export class NumberInputStatesExample {
  protected readonly qty = signal<number | null>(3);
}
