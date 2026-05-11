import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForListbox, ForListboxOption } from 'forty-cdk';

@Component({
  selector: 'app-listbox-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption],
  template: `
    <input data-testid="before" placeholder="before-listbox" />
    <ul forListbox [(value)]="value" aria-label="Fruit listbox">
      <li>
        <button data-testid="opt-apple" type="button" forListboxOption value="apple">
          Apple
        </button>
      </li>
      <li>
        <button data-testid="opt-banana" type="button" forListboxOption value="banana" disabled>
          Banana
        </button>
      </li>
      <li>
        <button data-testid="opt-cherry" type="button" forListboxOption value="cherry">
          Cherry
        </button>
      </li>
      <li>
        <button data-testid="opt-date" type="button" forListboxOption value="date">Date</button>
      </li>
    </ul>
    <input data-testid="after" placeholder="after-listbox" />
  `,
})
export class ListboxFixture {
  protected readonly value = signal<string[]>([]);
}
