import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxAnchor,
  type ForComboboxAutocomplete,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
  ForComboboxTrigger,
  type VetoableEvent,
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
    ForComboboxTrigger,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
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
      /* The picker trigger is wider than the bare input so trigger-vs-input
         anchoring is distinguishable by width in the E2E geometry checks. */
      [forComboboxTrigger] {
        width: 320px;
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
      (autoFocusOnOpen)="onAutoFocusOnOpen($event)"
      (autoFocusOnClose)="onAutoFocusOnClose($event)"
    >
      @if (picker) {
        <button data-testid="trigger" forComboboxTrigger>
          {{ value().at(0) ?? 'Pick a fruit' }}
        </button>
      } @else if (anchor) {
        <div data-testid="anchor" forComboboxAnchor>
          <span aria-hidden="true">🔎</span>
          <input data-testid="combo-input" forComboboxInput placeholder="Search fruits…" />
        </div>
      } @else {
        <input data-testid="combo-input" forComboboxInput placeholder="Search fruits…" />
      }
      @if (open()) {
        <div forComboboxContent data-testid="content">
          @if (picker) {
            <input data-testid="combo-input" forComboboxInput placeholder="Search fruits…" />
            <div data-testid="list" forComboboxList>
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
          } @else {
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
  // `?picker=1` renders the trigger + inner-list picker anatomy (#675): a
  // `[forComboboxTrigger]` button outside the panel and `[forComboboxInput]` +
  // `[forComboboxList]` inside `[forComboboxContent]`. Drives the focus hand-off
  // specs (focus → input on open, → trigger on close).
  protected readonly picker = queryFlag('picker');
  // `?vetoOpen=1` / `?vetoClose=1` preventDefault the picker focus hooks so the
  // veto path (focus stays put) is observable in a real browser.
  protected readonly vetoOpen = queryFlag('vetoOpen');
  protected readonly vetoClose = queryFlag('vetoClose');

  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase();
    return q === '' ? [...ALL_FRUITS] : ALL_FRUITS.filter((f) => f.includes(q));
  });

  protected onAutoFocusOnOpen(event: VetoableEvent): void {
    if (this.vetoOpen) {
      event.preventDefault();
    }
  }

  protected onAutoFocusOnClose(event: VetoableEvent): void {
    if (this.vetoClose) {
      event.preventDefault();
    }
  }
}
