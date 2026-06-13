import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxIndicator,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
  ForComboboxTrigger,
} from 'forty-cdk';

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
  selector: 'app-combobox-picker-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForCombobox,
    ForComboboxTrigger,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxInput,
    ForComboboxOption,
    ForComboboxIndicator,
    ForComboboxEmpty,
    Icon,
  ],
  template: `
    <playground-demo
      title="Picker (trigger + search inside the panel)"
      subtitle="The other anatomy: a button shows the committed selection while the search input lives inside the panel (shadcn / cmdk style). [forComboboxTrigger] opens the panel, becomes the positioning anchor and takes focus back on close; [forComboboxList] carries role=listbox so the input can sit beside it. Focus hands off into the input on open and returns to the trigger on close."
      sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/picker.example.ts"
    >
      <div demo class="combobox-demo">
        <div
          forCombobox
          class="pg-combobox"
          [(query)]="query"
          [(value)]="value"
          [(open)]="open"
          ariaLabel="Choose a country"
        >
          <button forComboboxTrigger type="button" class="pg-combobox-trigger">
            <span
              class="pg-combobox-trigger-label"
              [class.pg-combobox-trigger-placeholder]="!selectedLabel()"
            >
              {{ selectedLabel() ?? 'Select a country…' }}
            </span>
            <app-icon name="chevron-down" class="pg-combobox-trigger-chevron" />
          </button>

          @if (open()) {
            <div forComboboxContent class="pg-combobox-popup" animate.enter="pg-pop-in">
              <input forComboboxInput class="pg-combobox-search" placeholder="Search countries…" />
              <div forComboboxList class="pg-combobox-list">
                @for (country of filtered(); track country) {
                  <div
                    forComboboxOption
                    [value]="country"
                    [label]="country"
                    class="pg-combobox-option"
                  >
                    <span forComboboxIndicator class="pg-combobox-indicator">
                      <app-icon name="check" />
                    </span>
                    {{ country }}
                  </div>
                }
              </div>
              <div forComboboxEmpty class="pg-combobox-empty">
                No countries match "{{ query() }}".
              </div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          value: <b>{{ selectedLabel() ?? '—' }}</b
          ><br />
          open: <b>{{ open() }}</b
          ><br />
          query: <b>{{ query() || '—' }}</b>
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
export class ComboboxPickerExample {
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly value = signal<readonly string[]>([]);

  protected readonly selectedLabel = computed<string | null>(() => this.value()[0] ?? null);

  protected readonly filtered = computed<readonly string[]>(() => {
    const q = this.query().toLowerCase().trim();
    return q === '' ? COUNTRIES : COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  });
}
