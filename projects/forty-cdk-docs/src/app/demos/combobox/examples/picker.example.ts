import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxIndicator,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
  ForComboboxTrigger,
} from 'forty-cdk/combobox';

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
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForCombobox,
    ForComboboxTrigger,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxInput,
    ForComboboxOption,
    ForComboboxIndicator,
    ForComboboxEmpty,
  ],
  template: `
    <div
      forCombobox
      #combobox="forCombobox"
      class="picker-combobox"
      [(query)]="query"
      [(value)]="value"
      ariaLabel="Choose a country"
    >
      <button forComboboxTrigger type="button" class="picker-combobox-trigger">
        <span
          class="picker-combobox-trigger-label"
          [class.picker-combobox-trigger-placeholder]="!selectedLabel()"
        >
          {{ selectedLabel() ?? 'Select a country…' }}
        </span>
        <svg class="picker-combobox-trigger-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      @if (combobox.open()) {
        <div
          forComboboxContent
          class="picker-combobox-popup"
          animate.enter="picker-combobox-pop-in"
        >
          <input forComboboxInput class="picker-combobox-search" placeholder="Search countries…" />
          <div forComboboxList class="picker-combobox-list">
            @for (country of filtered(); track country) {
              <div
                forComboboxOption
                [value]="country"
                [label]="country"
                class="picker-combobox-option"
              >
                <span forComboboxIndicator class="picker-combobox-indicator">
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
                {{ country }}
              </div>
            }
          </div>
          <div forComboboxEmpty class="picker-combobox-empty">
            No countries match "{{ query() }}".
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    app-combobox-picker-example {
      display: contents;
    }

    .picker-combobox {
      display: block;
      width: min(300px, 100%);
    }

    .picker-combobox-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      color: var(--pg-text);
      font: inherit;
      text-align: start;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .picker-combobox-trigger:hover {
      background: var(--pg-surface-2);
    }

    .picker-combobox-trigger[aria-expanded='true'] {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .picker-combobox-trigger-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .picker-combobox-trigger-placeholder {
      color: var(--pg-text-muted);
    }

    .picker-combobox-trigger-chevron {
      flex: none;
      width: 1em;
      height: 1em;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .picker-combobox-trigger[aria-expanded='true'] .picker-combobox-trigger-chevron {
      transform: rotate(180deg);
    }

    .picker-combobox-popup {
      z-index: 60;
      display: flex;
      flex-direction: column;
      width: var(--for-floating-anchor-width);
      min-width: 14rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      overflow: hidden;
    }

    .picker-combobox-search {
      width: 100%;
      padding: 0.55rem 0.7rem;
      border: 0;
      border-bottom: 1px solid var(--pg-border);
      background: transparent;
      font: inherit;
      color: var(--pg-text);
    }

    .picker-combobox-search:focus-visible {
      outline: none;
    }

    .picker-combobox-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 220px;
      overflow-y: auto;
      padding: 4px;
    }

    .picker-combobox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      padding: 0.45rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      color: var(--pg-text);
      cursor: pointer;
    }

    .picker-combobox-option[data-highlighted],
    .picker-combobox-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .picker-combobox-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .picker-combobox-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .picker-combobox-indicator svg {
      width: 100%;
      height: 100%;
    }

    .picker-combobox-empty {
      padding: 0.6rem;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
      text-align: center;
    }

    .picker-combobox-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: picker-combobox-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes picker-combobox-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .picker-combobox-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ComboboxPickerExample {
  protected readonly query = signal('');
  protected readonly value = signal<readonly string[]>([]);

  protected readonly selectedLabel = computed<string | null>(() => this.value()[0] ?? null);

  protected readonly filtered = computed<readonly string[]>(() => {
    const q = this.query().toLowerCase().trim();
    return q === '' ? COUNTRIES : COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  });
}
