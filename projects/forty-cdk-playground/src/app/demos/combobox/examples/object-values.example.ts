import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxClear,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxIndicator,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface City {
  readonly id: string;
  readonly name: string;
  readonly country: string;
}

const CITIES: readonly City[] = [
  { id: 'ams', name: 'Amsterdam', country: 'Netherlands' },
  { id: 'bcn', name: 'Barcelona', country: 'Spain' },
  { id: 'ber', name: 'Berlin', country: 'Germany' },
  { id: 'lis', name: 'Lisbon', country: 'Portugal' },
  { id: 'lon', name: 'London', country: 'United Kingdom' },
  { id: 'mad', name: 'Madrid', country: 'Spain' },
  { id: 'mil', name: 'Milan', country: 'Italy' },
  { id: 'par', name: 'Paris', country: 'France' },
  { id: 'rom', name: 'Rome', country: 'Italy' },
  { id: 'vie', name: 'Vienna', country: 'Austria' },
];

@Component({
  selector: 'app-combobox-object-values-example',
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
    Icon,
  ],
  template: `
    <playground-demo
      title="Object values"
      subtitle="Real apps select objects, not strings. forCombobox is generic over T: bind the whole object to [forComboboxOption][value] and configure three hooks — [isItemEqualToValue] to match by a stable key (here id), [itemToStringLabel] for the visible label, and [itemToFormValue] to serialize what a native form submits. The committed value() holds the full City object; the form would post just its id."
      sourcePath="projects/forty-cdk-playground/src/app/demos/combobox/examples/object-values.example.ts"
    >
      <div demo class="combobox-demo">
        <div
          forCombobox
          class="pg-combobox"
          [(query)]="query"
          [(value)]="value"
          [(open)]="open"
          [isItemEqualToValue]="byId"
          [itemToStringLabel]="toLabel"
          [itemToFormValue]="toId"
          name="city"
          ariaLabel="City search"
        >
          <div class="pg-combobox-single">
            <input
              forComboboxInput
              class="pg-combobox-input pg-combobox-input--boxed"
              placeholder="Search a city…"
            />
            <button
              forComboboxClear
              class="pg-combobox-clear pg-combobox-clear--inset"
              aria-label="Clear"
            >
              ×
            </button>
          </div>

          @if (open()) {
            <div forComboboxContent class="pg-combobox-content" animate.enter="pg-pop-in">
              @for (city of filtered(); track city.id) {
                <div
                  forComboboxOption
                  [value]="city"
                  [label]="city.name"
                  class="pg-combobox-option"
                >
                  <span forComboboxIndicator class="pg-combobox-indicator">
                    <app-icon name="check" />
                  </span>
                  {{ city.name }}
                  <small style="margin-inline-start: auto; color: var(--pg-text-muted)">
                    {{ city.country }}
                  </small>
                </div>
              }
              <div forComboboxEmpty class="pg-combobox-empty">No cities match "{{ query() }}".</div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          query: <b>{{ query() || '—' }}</b
          ><br />
          selected object: <b>{{ selectedCity()?.name ?? '—' }}</b
          ><br />
          form value (id): <b>{{ formValue() }}</b>
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
export class ComboboxObjectValuesExample {
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly value = signal<readonly City[]>([]);

  protected readonly byId = (a: City, b: City): boolean => a.id === b.id;
  protected readonly toLabel = (city: City): string => city.name;
  protected readonly toId = (city: City): string => city.id;

  protected readonly selectedCity = computed<City | null>(() => this.value()[0] ?? null);
  protected readonly formValue = computed(() => this.value().map(this.toId).join(', ') || '—');

  protected readonly filtered = computed<readonly City[]>(() => {
    const q = this.query().toLowerCase().trim();
    if (q === '') {
      return CITIES;
    }
    return CITIES.filter(
      (city) => city.name.toLowerCase().includes(q) || city.country.toLowerCase().includes(q),
    );
  });
}
