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
  selector: 'app-combobox-default-example',
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
      class="combobox"
      [(query)]="query"
      [(value)]="value"
      ariaLabel="Country search"
    >
      <div class="combobox-single">
        <input
          forComboboxInput
          class="combobox-input combobox-input--boxed"
          placeholder="Search countries…"
        />
        <button forComboboxClear class="combobox-clear combobox-clear--inset" aria-label="Clear">
          ×
        </button>
      </div>

      @if (combobox.open()) {
        <div forComboboxContent class="combobox-content" animate.enter="combobox-pop-in">
          @for (country of filtered(); track country) {
            <div forComboboxOption [value]="country" [label]="country" class="combobox-option">
              <span forComboboxIndicator class="combobox-indicator">
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
          <div forComboboxEmpty class="combobox-empty">No countries match "{{ query() }}".</div>
        </div>
      }
    </div>
  `,
  styles: `
    app-combobox-default-example {
      display: contents;
    }

    .combobox {
      display: block;
      width: min(300px, 100%);
    }

    .combobox-single {
      position: relative;
      width: 100%;
    }

    .combobox-input {
      font: inherit;
      font-size: 0.9rem;
      color: var(--pg-text);
    }

    .combobox-input--boxed {
      width: 100%;
      padding: 0.55rem 2.2rem 0.55rem 0.7rem;
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .combobox-input--boxed:focus-visible {
      outline: none;
    }

    .combobox-single:focus-within .combobox-input--boxed {
      border-color: var(--pg-primary);
      box-shadow: 0 0 0 1px var(--pg-primary);
    }

    .combobox-clear {
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

    .combobox-clear:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    .combobox-clear--inset {
      position: absolute;
      top: 50%;
      inset-inline-end: 0.35rem;
      transform: translateY(-50%);
    }

    .combobox-content {
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

    .combobox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      padding: 0.45rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      color: var(--pg-text);
      cursor: pointer;
    }

    .combobox-option[data-highlighted],
    .combobox-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .combobox-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .combobox-option[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .combobox-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .combobox-indicator svg {
      width: 100%;
      height: 100%;
    }

    .combobox-empty {
      padding: 0.6rem;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
      text-align: center;
    }

    .combobox-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: combobox-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes combobox-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .combobox-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ComboboxDefaultExample {
  protected readonly query = signal('');
  protected readonly value = signal<readonly string[]>([]);

  protected readonly filtered = computed<readonly string[]>(() => {
    const q = this.query().toLowerCase().trim();
    return q === '' ? COUNTRIES : COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  });
}
