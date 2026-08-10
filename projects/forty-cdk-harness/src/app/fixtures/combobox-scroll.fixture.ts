import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';

const ITEMS = Array.from({ length: 40 }, (_, index) => `item-${index}`);
const PRESELECTED = 'item-30';

@Component({
  selector: 'app-combobox-scroll-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div
      forCombobox
      #cb="forCombobox"
      [(query)]="query"
      [(value)]="value"
      [(open)]="open"
      ariaLabel="Pick an item"
    >
      <input data-testid="input" forComboboxInput placeholder="Search…" />
      <button data-testid="open-selected" type="button" (click)="cb.openOverlay('selected')">
        Open
      </button>
      @if (open()) {
        <div
          forComboboxContent
          data-testid="content"
          style="overflow: auto; max-height: 160px; background: #fff;"
        >
          @for (item of items; track item) {
            <div forComboboxOption [attr.data-testid]="'opt-' + item" [value]="item">
              {{ item }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ComboboxScrollFixture {
  protected readonly items = ITEMS;
  protected readonly query = signal('');
  protected readonly value = signal<readonly string[]>([PRESELECTED]);
  protected readonly open = signal(false);
}
