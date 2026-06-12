import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxAnchor,
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
  imports: [
    ForCombobox,
    ForComboboxAnchor,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
  ],
  styles: [
    `
      /* The decorated field box is deliberately wider than the inner input so
         anchor-vs-input positioning is distinguishable by width. */
      [forComboboxAnchor] {
        display: inline-flex;
        align-items: center;
        width: 320px;
        padding: 0 8px;
        box-sizing: border-box;
        border: 1px solid #ccc;
      }
      [forComboboxAnchor] [forComboboxInput] {
        flex: 1;
      }
    `,
  ],
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
      @if (anchor) {
        <div data-testid="anchor" forComboboxAnchor>
          <span aria-hidden="true">🔎</span>
          <input data-testid="combo-input" forComboboxInput placeholder="Search fruits…" />
        </div>
      } @else {
        <input data-testid="combo-input" forComboboxInput placeholder="Search fruits…" />
      }
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
  // `?anchor=1` wraps the input in a wider `[forComboboxAnchor]` field box so
  // e2e specs can assert the listbox is positioned / sized against the box
  // (`--for-anchor-width` ≈ 320px) rather than the inner input.
  protected readonly anchor = queryFlag('anchor');

  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase();
    return q === '' ? [...ALL_FRUITS] : ALL_FRUITS.filter((f) => f.includes(q));
  });
}
