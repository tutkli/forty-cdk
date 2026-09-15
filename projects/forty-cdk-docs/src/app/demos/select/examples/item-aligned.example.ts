import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  ForSelect,
  ForSelectContent,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';

interface Option {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-select-item-aligned-example',
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
      class="aligned-select-field"
      [(value)]="value"
      position="item-aligned"
      [collisionPadding]="10"
      placeholder="Country"
      ariaLabel="Country"
    >
      <button forSelectTrigger type="button" class="aligned-select-trigger">
        <span forSelectValue></span>
        <svg class="aligned-select-chevron" viewBox="0 0 24 24" aria-hidden="true">
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
        <div forSelectContent class="aligned-select-content" animate.enter="aligned-select-pop-in">
          @for (opt of countries; track opt.value) {
            <button forSelectOption type="button" class="aligned-select-option" [value]="opt.value">
              <span forSelectIndicator class="aligned-select-indicator">
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
              {{ opt.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    app-select-item-aligned-example {
      display: contents;
    }

    .aligned-select-field {
      display: block;
      width: min(260px, 100%);
    }

    .aligned-select-trigger {
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

    .aligned-select-trigger:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .aligned-select-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--ex-muted, #585d66);
      transition: transform 0.15s ease;
    }

    .aligned-select-trigger[aria-expanded='true'] .aligned-select-chevron {
      transform: rotate(180deg);
    }

    .aligned-select-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-floating-anchor-width);
      max-height: var(--for-floating-available-height);
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

    .aligned-select-option {
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

    .aligned-select-option[data-highlighted],
    .aligned-select-option:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .aligned-select-option[data-state='checked'] {
      color: var(--ex-accent, #0e7c6b);
      font-weight: 600;
    }

    .aligned-select-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--ex-accent, #0e7c6b);
    }

    .aligned-select-indicator[hidden] {
      display: none;
    }

    .aligned-select-indicator svg {
      width: 100%;
      height: 100%;
    }

    .aligned-select-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: aligned-select-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
    }

    @keyframes aligned-select-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .aligned-select-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class SelectItemAlignedExample {
  protected readonly countries: readonly Option[] = [
    { value: 'es', label: 'Spain' },
    { value: 'fr', label: 'France' },
    { value: 'de', label: 'Germany' },
    { value: 'it', label: 'Italy' },
    { value: 'pt', label: 'Portugal' },
    { value: 'nl', label: 'Netherlands' },
  ];

  protected readonly value = signal<readonly string[]>(['de']);
}
