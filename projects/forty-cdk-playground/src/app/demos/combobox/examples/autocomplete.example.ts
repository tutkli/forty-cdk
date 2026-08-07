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
  selector: 'app-combobox-autocomplete-example',
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
      class="ac-combobox"
      autocompleteMode="both"
      [(query)]="query"
      [(value)]="value"
      ariaLabel="Country search"
    >
      <div class="ac-combobox-single">
        <input
          forComboboxInput
          class="ac-combobox-input ac-combobox-input--boxed"
          placeholder="Type to autocomplete…"
        />
        <button
          forComboboxClear
          class="ac-combobox-clear ac-combobox-clear--inset"
          aria-label="Clear"
        >
          ×
        </button>
      </div>

      @if (combobox.open()) {
        <div forComboboxContent class="ac-combobox-content" animate.enter="ac-combobox-pop-in">
          @for (country of filtered(); track country) {
            <div forComboboxOption [value]="country" [label]="country" class="ac-combobox-option">
              <span forComboboxIndicator class="ac-combobox-indicator">
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
          <div forComboboxEmpty class="ac-combobox-empty">No countries match "{{ query() }}".</div>
        </div>
      }
    </div>
  `,
  styles: `
    app-combobox-autocomplete-example {
      display: contents;
    }

    .ac-combobox {
      display: block;
      width: min(300px, 100%);
    }

    .ac-combobox-single {
      position: relative;
      width: 100%;
    }

    .ac-combobox-input {
      font: inherit;
      font-size: 0.9rem;
      color: var(--pg-text);
    }

    .ac-combobox-input--boxed {
      width: 100%;
      padding: 0.55rem 2.2rem 0.55rem 0.7rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .ac-combobox-input--boxed:focus-visible {
      outline: none;
    }

    .ac-combobox-single:focus-within .ac-combobox-input--boxed {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .ac-combobox-clear {
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

    .ac-combobox-clear:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    .ac-combobox-clear--inset {
      position: absolute;
      top: 50%;
      inset-inline-end: 0.35rem;
      transform: translateY(-50%);
    }

    .ac-combobox-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-floating-anchor-width);
      min-width: 12rem;
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .ac-combobox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      padding: 0.45rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      color: var(--pg-text);
      cursor: pointer;
    }

    .ac-combobox-option[data-highlighted],
    .ac-combobox-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .ac-combobox-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .ac-combobox-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .ac-combobox-indicator svg {
      width: 100%;
      height: 100%;
    }

    .ac-combobox-empty {
      padding: 0.6rem;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
      text-align: center;
    }

    .ac-combobox-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: ac-combobox-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes ac-combobox-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ac-combobox-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ComboboxAutocompleteExample {
  protected readonly query = signal('');
  protected readonly value = signal<readonly string[]>([]);

  protected readonly filtered = computed<readonly string[]>(() => {
    const q = this.query().toLowerCase().trim();
    return q === '' ? COUNTRIES : COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  });
}
