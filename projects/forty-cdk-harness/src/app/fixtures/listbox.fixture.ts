import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForListbox, ForListboxOption } from 'forty-cdk';

interface Fruit {
  value: string;
  label: string;
  disabled: boolean;
}

const FRUITS: readonly Fruit[] = [
  { value: 'apple', label: 'Apple', disabled: false },
  { value: 'banana', label: 'Banana', disabled: true },
  { value: 'cherry', label: 'Cherry', disabled: false },
  { value: 'date', label: 'Date', disabled: false },
];

/**
 * Listbox harness fixture. The `remove-active` / `disable-active` control
 * buttons (placed before the listbox so Tab re-entry can be asserted from a
 * deterministic anchor) mutate the option list at runtime, exercising the
 * RovingTabindex self-heal contract: removing or disabling the option that
 * currently owns the tab stop must hand it to the next enabled option so the
 * listbox stays keyboard-reachable.
 */
@Component({
  selector: 'app-listbox-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption],
  template: `
    <input data-testid="before" placeholder="before-listbox" />
    <button data-testid="remove-active" type="button" (click)="removeApple()">remove</button>
    <button data-testid="disable-active" type="button" (click)="disableApple()">disable</button>
    <ul forListbox [(value)]="value" aria-label="Fruit listbox">
      @for (fruit of fruits(); track fruit.value) {
        <li>
          <button
            [attr.data-testid]="'opt-' + fruit.value"
            type="button"
            forListboxOption
            [value]="fruit.value"
            [disabled]="fruit.disabled"
          >
            {{ fruit.label }}
          </button>
        </li>
      }
    </ul>
    <input data-testid="after" placeholder="after-listbox" />
  `,
})
export class ListboxFixture {
  protected readonly value = signal<readonly string[]>([]);
  protected readonly fruits = signal<readonly Fruit[]>(FRUITS);

  protected removeApple(): void {
    this.fruits.update((list) => list.filter((f) => f.value !== 'apple'));
  }

  protected disableApple(): void {
    this.fruits.update((list) =>
      list.map((f) => (f.value === 'apple' ? { ...f, disabled: true } : f)),
    );
  }
}
