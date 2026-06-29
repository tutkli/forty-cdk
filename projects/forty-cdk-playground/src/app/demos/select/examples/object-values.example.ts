import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  ForSelect,
  ForSelectContent,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';

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
  selector: 'app-select-object-values-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForSelectIndicator,
  ],
  template: `
    <div
      forSelect
      #select="forSelect"
      class="obj-select-field"
      [(value)]="value"
      [isItemEqualToValue]="byCode"
      [itemToFormValue]="toCode"
      name="country"
      placeholder="Pick a country"
      ariaLabel="Country"
    >
      <button forSelectTrigger type="button" class="obj-select-trigger">
        <span forSelectValue></span>
        <svg class="obj-select-chevron" viewBox="0 0 24 24" aria-hidden="true">
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
      @if (select.open()) {
        <div forSelectContent class="obj-select-content" animate.enter="obj-select-pop-in">
          @for (country of countries; track country.code) {
            <button forSelectOption type="button" class="obj-select-option" [value]="country">
              <span forSelectIndicator class="obj-select-indicator">
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
              {{ country.name }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    app-select-object-values-example {
      display: contents;
    }

    .obj-select-field {
      display: block;
      width: min(260px, 100%);
    }

    .obj-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      padding: 0.4rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .obj-select-trigger:hover {
      background: var(--pg-surface-2);
    }

    .obj-select-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .obj-select-trigger[aria-expanded='true'] .obj-select-chevron {
      transform: rotate(180deg);
    }

    .obj-select-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-anchor-width);
      max-height: 260px;
      overflow-y: auto;
      padding: 4px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .obj-select-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      padding: 0.4rem 0.6rem;
      border: 0;
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text);
      cursor: pointer;
    }

    .obj-select-option[data-highlighted],
    .obj-select-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .obj-select-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .obj-select-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .obj-select-indicator[hidden] {
      display: none;
    }

    .obj-select-indicator svg {
      width: 100%;
      height: 100%;
    }

    .obj-select-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: obj-select-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes obj-select-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .obj-select-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class SelectObjectValuesExample {
  protected readonly countries = COUNTRIES;
  protected readonly value = signal<readonly Country[]>([]);

  protected readonly byCode = (a: Country, b: Country): boolean => a.code === b.code;
  protected readonly toCode = (country: Country): string => country.code;
}
