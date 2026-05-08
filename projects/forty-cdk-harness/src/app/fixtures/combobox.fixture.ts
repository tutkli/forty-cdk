import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk';

const ALL_FRUITS = ['apple', 'apricot', 'banana', 'blueberry', 'cherry', 'date'] as const;
type Fruit = (typeof ALL_FRUITS)[number];

@Component({
  selector: 'app-combobox-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <input id="before" placeholder="before-trigger" />
    <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open" ariaLabel="Fruit search">
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
    <input id="after" placeholder="after-trigger" />
  `,
})
export class ComboboxFixture {
  protected readonly query = signal('');
  protected readonly value = signal<readonly Fruit[]>([]);
  protected readonly open = signal(false);

  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase();
    return q === '' ? [...ALL_FRUITS] : ALL_FRUITS.filter((f) => f.includes(q));
  });
}
