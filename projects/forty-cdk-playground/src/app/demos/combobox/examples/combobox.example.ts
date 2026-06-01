import { ChangeDetectionStrategy, Component, computed, linkedSignal, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxChip,
  ForComboboxChipRemove,
  ForComboboxChips,
  ForComboboxClear,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxIndicator,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

const COUNTRIES = [
  'Argentina',
  'Australia',
  'Brazil',
  'Canada',
  'Chile',
  'China',
  'France',
  'Germany',
  'India',
  'Italy',
  'Japan',
  'Mexico',
  'Spain',
  'United Kingdom',
  'United States',
] as const;

@Component({
  selector: 'app-combobox-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxIndicator,
    ForComboboxEmpty,
    ForComboboxClear,
    ForComboboxChips,
    ForComboboxChip,
    ForComboboxChipRemove,
    ControlSelect,
    ControlSwitch,
    Icon,
  ],
  template: `
    <playground-demo
      title="Filter, chips & autocomplete"
      subtitle="An editable input paired with a portaled listbox. Focus never leaves the input — arrow keys move aria-activedescendant, not DOM focus. Filtering is the consumer's job (the primitive is headless): the query signal drives a computed filter. Single mode commits the chosen label and shows a clear button; multiple mode renders selections as chips with Backspace + arrow navigation. autocompleteMode 'both' inline-completes the first match into the input."
      sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/combobox.example.ts"
    >
      <div demo class="combobox-demo">
        <div
          forCombobox
          class="pg-combobox"
          [multiple]="multiple()"
          [(query)]="query"
          [(value)]="value"
          [(open)]="open"
          [autocompleteMode]="autocompleteMode()"
          [openOnFocus]="openOnFocus()"
          [autoHighlight]="autoHighlight()"
          ariaLabel="Country search"
        >
          @if (multiple()) {
            <div forComboboxChips class="pg-combobox-field pg-combobox-field--chips">
              @for (entry of value(); track entry) {
                <span forComboboxChip [value]="entry" class="pg-combobox-chip">
                  {{ entry }}
                  <button forComboboxChipRemove class="pg-combobox-chip-remove">×</button>
                </span>
              }
              <input forComboboxInput class="pg-combobox-input" placeholder="Add countries…" />
            </div>
          } @else {
            <div class="pg-combobox-single">
              <input
                forComboboxInput
                class="pg-combobox-input pg-combobox-input--boxed"
                placeholder="Search countries…"
              />
              <button
                forComboboxClear
                class="pg-combobox-clear pg-combobox-clear--inset"
                aria-label="Clear"
              >
                ×
              </button>
            </div>
          }

          @if (open()) {
            <div forComboboxContent class="pg-combobox-content" animate.enter="pg-pop-in">
              @for (country of filtered(); track country) {
                <div
                  forComboboxOption
                  [value]="country"
                  [label]="country"
                  class="pg-combobox-option"
                >
                  <span forComboboxIndicator [forceMount]="true" class="pg-combobox-indicator">
                    <app-icon name="check" />
                  </span>
                  {{ country }}
                </div>
              }
              <div forComboboxEmpty class="pg-combobox-empty">
                No countries match "{{ query() }}".
              </div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="multiple" [(checked)]="multiple" />
        <app-control-select
          label="autocompleteMode"
          [options]="autocompleteOptions"
          [(value)]="autocompleteMode"
        />
        <app-control-switch label="openOnFocus" [(checked)]="openOnFocus" />
        <app-control-switch label="autoHighlight" [(checked)]="autoHighlight" />

        <p class="pg-state">
          query: <b>{{ query() || '—' }}</b
          ><br />
          value: <b>{{ value().join(', ') || '—' }}</b
          ><br />
          open: <b>{{ open() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .combobox-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
      width: 100%;
    }

    .combobox-demo .pg-combobox {
      width: min(300px, 100%);
    }
  `,
})
export class ComboboxExample {
  protected readonly autocompleteOptions: readonly ControlOption<'list' | 'both'>[] = [
    { value: 'list', label: 'list' },
    { value: 'both', label: 'both (inline)' },
  ];

  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly openOnFocus = signal(false);
  protected readonly autoHighlight = signal(true);

  protected readonly multiple = signal(false);
  protected readonly value = linkedSignal<boolean, readonly string[]>({
    source: this.multiple,
    computation: () => [],
  });

  protected readonly autocompleteMode = signal<'list' | 'both'>('list');

  protected readonly filtered = computed<readonly string[]>(() => {
    const q = this.query().toLowerCase().trim();
    return q === '' ? COUNTRIES : COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  });
}
