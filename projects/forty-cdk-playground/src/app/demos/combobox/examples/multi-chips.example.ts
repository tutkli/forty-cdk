import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  ForCombobox,
  ForComboboxChip,
  ForComboboxChipRemove,
  ForComboboxChips,
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
  selector: 'app-combobox-multi-chips-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxIndicator,
    ForComboboxEmpty,
    ForComboboxChips,
    ForComboboxChip,
    ForComboboxChipRemove,
  ],
  template: `
    <div
      forCombobox
      #combobox="forCombobox"
      class="chips-combobox"
      multiple
      [(query)]="query"
      [(value)]="value"
      ariaLabel="Country search"
    >
      <div forComboboxChips class="chips-combobox-field">
        @for (entry of value(); track entry) {
          <span forComboboxChip [value]="entry" class="chips-combobox-chip">
            {{ entry }}
            <button forComboboxChipRemove class="chips-combobox-chip-remove">×</button>
          </span>
        }
        <input forComboboxInput class="chips-combobox-input" placeholder="Add countries…" />
      </div>

      @if (combobox.open()) {
        <div
          forComboboxContent
          class="chips-combobox-content"
          animate.enter="chips-combobox-pop-in"
        >
          @for (country of filtered(); track country) {
            <div
              forComboboxOption
              [value]="country"
              [label]="country"
              class="chips-combobox-option"
            >
              <span forComboboxIndicator class="chips-combobox-indicator">
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
          <div forComboboxEmpty class="chips-combobox-empty">
            No countries match "{{ query() }}".
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    app-combobox-multi-chips-example {
      display: contents;
    }

    .chips-combobox {
      display: block;
      width: min(300px, 100%);
    }

    .chips-combobox-field {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.3rem;
      width: 100%;
      padding: 0.3rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .chips-combobox-field:focus-within {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .chips-combobox-input {
      flex: 1;
      min-width: 80px;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.2rem 0;
      border: 0;
      background: transparent;
      color: var(--pg-text);
    }

    .chips-combobox-input:focus-visible {
      outline: none;
    }

    .chips-combobox-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.15rem 0.2rem 0.15rem 0.5rem;
      font-size: 0.8rem;
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    .chips-combobox-chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      font-size: 0.95rem;
      line-height: 1;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--pg-text-muted);
      cursor: pointer;
    }

    .chips-combobox-chip-remove:hover {
      background: var(--pg-border-strong);
      color: var(--pg-text);
    }

    .chips-combobox-content {
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

    .chips-combobox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      padding: 0.45rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      color: var(--pg-text);
      cursor: pointer;
    }

    .chips-combobox-option[data-highlighted],
    .chips-combobox-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .chips-combobox-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .chips-combobox-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .chips-combobox-indicator svg {
      width: 100%;
      height: 100%;
    }

    .chips-combobox-empty {
      padding: 0.6rem;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
      text-align: center;
    }

    .chips-combobox-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: chips-combobox-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes chips-combobox-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .chips-combobox-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ComboboxMultiChipsExample {
  protected readonly query = signal('');
  protected readonly value = signal<readonly string[]>(['Spain', 'Japan']);

  protected readonly filtered = computed<readonly string[]>(() => {
    const q = this.query().toLowerCase().trim();
    return q === '' ? COUNTRIES : COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  });
}
