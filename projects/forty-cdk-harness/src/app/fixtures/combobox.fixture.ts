import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForCombobox,
  type ForComboboxAutocomplete,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk';

import { queryFlag } from './_query-flag';

const ALL_FRUITS = ['apple', 'apricot', 'banana', 'blueberry', 'cherry', 'date'] as const;
type Fruit = (typeof ALL_FRUITS)[number];

@Component({
  selector: 'app-combobox-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <input data-testid="before" placeholder="before-trigger" />
    <div
      forCombobox
      [(query)]="query"
      [(value)]="value"
      [(open)]="open"
      [autocompleteMode]="autocompleteMode"
      ariaLabel="Fruit search"
    >
      <input data-testid="combo-input" forComboboxInput placeholder="Search fruits…" />
      @if (open()) {
        <div forComboboxContent data-testid="content">
          @for (opt of filtered(); track opt) {
            <div
              forComboboxOption
              [attr.data-testid]="'opt-' + opt"
              [value]="opt"
              [disabled]="opt === 'cherry'"
            >
              {{ opt }}
            </div>
          }
        </div>
      }
    </div>
    <input data-testid="after" placeholder="after-trigger" />
  `,
})
export class ComboboxFixture {
  protected readonly query = signal('');
  protected readonly value = signal<readonly Fruit[]>([]);
  // `?open=1` starts the listbox open so options render and the inline-autocomplete
  // snapshot is populated before a spec drives input (used by the IME case).
  protected readonly open = signal(queryFlag('open'));
  // `?inline=1` switches on inline autocomplete (`both` keeps the listbox too)
  // so the IME spec can assert completion is suppressed while composing.
  protected readonly autocompleteMode: ForComboboxAutocomplete = queryFlag('inline')
    ? 'both'
    : 'list';

  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase();
    return q === '' ? [...ALL_FRUITS] : ALL_FRUITS.filter((f) => f.includes(q));
  });
}
