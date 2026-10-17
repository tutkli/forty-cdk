import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';

@Component({
  selector: 'app-number-input-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  template: `
    <button data-testid="before">Before</button>
    <div forNumberInputGroup>
      <button forNumberInputDecrement ariaLabel="Decrease" data-testid="dec">−</button>
      <input
        forNumberInput
        [(value)]="qty"
        [min]="0"
        [max]="10"
        aria-label="Quantity"
        data-testid="input"
      />
      <button forNumberInputIncrement ariaLabel="Increase" data-testid="inc">+</button>
    </div>
    <button data-testid="after">After</button>
    <span data-testid="value">{{ qty() }}</span>
  `,
})
export class NumberInputFixture {
  readonly qty = signal<number | null>(9);
}
