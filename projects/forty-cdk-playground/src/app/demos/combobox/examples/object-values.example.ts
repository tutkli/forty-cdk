import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  ForCombobox,
  ForComboboxClear,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxIndicator,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';

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
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxIndicator,
    ForComboboxEmpty,
    ForComboboxClear,
  ],
  template: `
    <div
      forCombobox
      #combobox="forCombobox"
      class="obj-combobox"
      [(query)]="query"
      [(value)]="value"
      [isItemEqualToValue]="byId"
      [itemToStringLabel]="toLabel"
      [itemToFormValue]="toId"
      name="city"
      ariaLabel="City search"
    >
      <div class="obj-combobox-single">
        <input
          forComboboxInput
          class="obj-combobox-input obj-combobox-input--boxed"
          placeholder="Search a city…"
        />
        <button
          forComboboxClear
          class="obj-combobox-clear obj-combobox-clear--inset"
          aria-label="Clear"
        >
          ×
        </button>
      </div>

      @if (combobox.open()) {
        <div forComboboxContent class="obj-combobox-content" animate.enter="obj-combobox-pop-in">
          @for (city of filtered(); track city.id) {
            <div forComboboxOption [value]="city" [label]="city.name" class="obj-combobox-option">
              <span forComboboxIndicator class="obj-combobox-indicator">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m4.5 12.75 6 6 9-13.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              {{ city.name }}
              <small class="obj-combobox-meta">{{ city.country }}</small>
            </div>
          }
          <div forComboboxEmpty class="obj-combobox-empty">No cities match "{{ query() }}".</div>
        </div>
      }
    </div>
  `,
  styles: `
    app-combobox-object-values-example {
      display: contents;
    }

    .obj-combobox {
      display: block;
      width: min(300px, 100%);
    }

    .obj-combobox-single {
      position: relative;
      width: 100%;
    }

    .obj-combobox-input {
      font: inherit;
      font-size: 0.9rem;
      color: var(--pg-text);
    }

    .obj-combobox-input--boxed {
      width: 100%;
      padding: 0.55rem 2.2rem 0.55rem 0.7rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .obj-combobox-input--boxed:focus-visible {
      outline: none;
    }

    .obj-combobox-single:focus-within .obj-combobox-input--boxed {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .obj-combobox-clear {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      font-size: 1.1rem;
      line-height: 1;
      border: 0;
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text-muted);
      cursor: pointer;
    }

    .obj-combobox-clear:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    .obj-combobox-clear--inset {
      position: absolute;
      top: 50%;
      inset-inline-end: 0.35rem;
      transform: translateY(-50%);
    }

    .obj-combobox-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-anchor-width);
      min-width: 12rem;
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .obj-combobox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      padding: 0.45rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      color: var(--pg-text);
      cursor: pointer;
    }

    .obj-combobox-option[data-highlighted],
    .obj-combobox-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .obj-combobox-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .obj-combobox-meta {
      margin-inline-start: auto;
      color: var(--pg-text-muted);
    }

    .obj-combobox-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .obj-combobox-indicator svg {
      width: 100%;
      height: 100%;
    }

    .obj-combobox-empty {
      padding: 0.6rem;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
      text-align: center;
    }

    .obj-combobox-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: obj-combobox-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes obj-combobox-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .obj-combobox-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ComboboxObjectValuesExample {
  protected readonly query = signal('');
  protected readonly value = signal<readonly City[]>([]);

  protected readonly byId = (a: City, b: City): boolean => a.id === b.id;
  protected readonly toLabel = (city: City): string => city.name;
  protected readonly toId = (city: City): string => city.id;

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
