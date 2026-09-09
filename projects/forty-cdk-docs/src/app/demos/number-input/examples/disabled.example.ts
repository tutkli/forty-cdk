import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';

@Component({
  selector: 'app-number-input-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  template: `
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
  `,
  styles: `
    :host {
      display: contents;
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

    .step-btn[data-disabled] {
      cursor: not-allowed;
    }
  `,
})
export class NumberInputDisabledExample {
  protected readonly qty = signal<number | null>(3);
}
