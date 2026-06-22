import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForSelect,
  ForSelectContent,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface Country {
  readonly code: string;
  readonly name: string;
}

const COUNTRIES: readonly Country[] = [
  { code: 'ar', name: 'Argentina' },
  { code: 'au', name: 'Australia' },
  { code: 'br', name: 'Brazil' },
  { code: 'ca', name: 'Canada' },
  { code: 'cn', name: 'China' },
  { code: 'de', name: 'Germany' },
  { code: 'eg', name: 'Egypt' },
  { code: 'es', name: 'Spain' },
  { code: 'fr', name: 'France' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'in', name: 'India' },
  { code: 'it', name: 'Italy' },
  { code: 'jp', name: 'Japan' },
  { code: 'kr', name: 'South Korea' },
  { code: 'mx', name: 'Mexico' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'no', name: 'Norway' },
  { code: 'pt', name: 'Portugal' },
  { code: 'se', name: 'Sweden' },
  { code: 'us', name: 'United States' },
];

@Component({
  selector: 'app-select-typeahead-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForSelectIndicator,
    Icon,
  ],
  template: `
    <playground-demo
      title="Object values & typeahead"
      subtitle="forSelect is generic over T: bind whole objects to [forSelectOption][value], match them by a stable key with [isItemEqualToValue], and serialize what a native form submits with [itemToFormValue]. Typeahead mirrors native <select>: with the listbox open, printable keys move focus to the first match; once it has been opened once (so the option cache is warm), typing on the closed trigger selects the match without opening at all — try typing 'sp' or 'un'."
      sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/typeahead.example.ts"
    >
      <div demo class="select-demo">
        <div
          forSelect
          #select="forSelect"
          class="select-field"
          [(value)]="value"
          [isItemEqualToValue]="byCode"
          [itemToFormValue]="toCode"
          name="country"
          placeholder="Pick a country"
          ariaLabel="Country"
        >
          <button forSelectTrigger type="button" class="pg-select-trigger">
            <span forSelectValue></span>
            <app-icon class="pg-select-chevron" name="chevron-down" />
          </button>
          @if (select.open()) {
            <div forSelectContent class="pg-select-content" animate.enter="pg-pop-in">
              @for (country of countries; track country.code) {
                <button forSelectOption type="button" class="pg-select-option" [value]="country">
                  <span forSelectIndicator class="pg-select-indicator">
                    <app-icon name="check" />
                  </span>
                  {{ country.name }}
                </button>
              }
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          selected object: <b>{{ selectedCountry()?.name ?? '—' }}</b
          ><br />
          form value (code): <b>{{ formValue() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .select-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
      width: 100%;
    }

    .select-field {
      display: block;
      width: min(260px, 100%);
    }
  `,
})
export class SelectTypeaheadExample {
  protected readonly countries = COUNTRIES;
  protected readonly value = signal<readonly Country[]>([]);

  protected readonly byCode = (a: Country, b: Country): boolean => a.code === b.code;
  protected readonly toCode = (country: Country): string => country.code;

  protected readonly selectedCountry = computed<Country | null>(() => this.value()[0] ?? null);
  protected readonly formValue = computed(() => this.value().map(this.toCode).join(', ') || '—');
}
