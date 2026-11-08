import { ChangeDetectionStrategy, Component, signal, type WritableSignal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk/checkbox';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';

@Component({
  selector: 'app-form-required-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCheckbox, ForCombobox, ForComboboxContent, ForComboboxInput, ForComboboxOption],
  template: `
    <form data-testid="combo-form" (submit)="onSubmit($event, comboSubmits)">
      <div
        forCombobox
        name="fruit"
        [required]="true"
        [(value)]="fruit"
        [(open)]="open"
        ariaLabel="Fruit"
      >
        <input data-testid="combo-input" forComboboxInput />
        @if (open()) {
          <div forComboboxContent>
            @for (opt of fruits; track opt) {
              <div forComboboxOption [attr.data-testid]="'opt-' + opt" [value]="opt">
                {{ opt }}
              </div>
            }
          </div>
        }
      </div>
      <button type="submit" data-testid="combo-submit">Submit</button>
      <output data-testid="combo-submits">{{ comboSubmits() }}</output>
    </form>

    <form data-testid="checkbox-form" (submit)="onSubmit($event, checkboxSubmits)">
      <button forCheckbox name="terms" [required]="true" aria-label="Terms" data-testid="checkbox">
        C
      </button>
      <button type="submit" data-testid="checkbox-submit">Submit</button>
      <output data-testid="checkbox-submits">{{ checkboxSubmits() }}</output>
    </form>
  `,
})
export class FormRequiredFixture {
  protected readonly fruits = ['apple', 'banana', 'cherry'] as const;
  protected readonly fruit = signal<readonly string[]>([]);
  protected readonly open = signal(false);
  protected readonly comboSubmits = signal(0);
  protected readonly checkboxSubmits = signal(0);

  protected onSubmit(event: Event, count: WritableSignal<number>): void {
    event.preventDefault();
    count.update((n) => n + 1);
  }
}
