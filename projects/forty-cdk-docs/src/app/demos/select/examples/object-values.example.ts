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
      [compareWith]="byCode"
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
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .obj-select-trigger:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .obj-select-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--ex-muted, #585d66);
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
      width: var(--for-floating-anchor-width);
      max-height: 260px;
      overflow-y: auto;
      padding: 4px;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
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
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .obj-select-option[data-highlighted],
    .obj-select-option:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .obj-select-option[data-state='checked'] {
      color: var(--ex-accent, #0e7c6b);
      font-weight: 600;
    }

    .obj-select-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--ex-accent, #0e7c6b);
    }

    .obj-select-indicator[hidden] {
      display: none;
    }

    .obj-select-indicator svg {
      width: 100%;
      height: 100%;
    }

    .obj-select-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: obj-select-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
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
