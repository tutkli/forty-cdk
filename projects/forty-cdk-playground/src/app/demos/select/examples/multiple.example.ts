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
  selector: 'app-select-multiple-example',
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
      class="multi-select-field"
      multiple
      [(value)]="value"
      placeholder="Pick tags…"
      ariaLabel="Tags"
    >
      <button forSelectTrigger type="button" class="multi-select-trigger">
        <span forSelectValue></span>
        <svg class="multi-select-chevron" viewBox="0 0 24 24" aria-hidden="true">
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
        <div forSelectContent class="multi-select-content" animate.enter="multi-select-pop-in">
          @for (opt of options; track opt.value) {
            <button forSelectOption type="button" class="multi-select-option" [value]="opt.value">
              <span forSelectIndicator class="multi-select-indicator">
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
    app-select-multiple-example {
      display: contents;
    }

    .multi-select-field {
      display: block;
      width: min(260px, 100%);
    }

    .multi-select-trigger {
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

    .multi-select-trigger:hover {
      background: var(--pg-surface-2);
    }

    .multi-select-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .multi-select-trigger[aria-expanded='true'] .multi-select-chevron {
      transform: rotate(180deg);
    }

    .multi-select-content {
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

    .multi-select-option {
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

    .multi-select-option[data-highlighted],
    .multi-select-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .multi-select-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .multi-select-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .multi-select-indicator[hidden] {
      display: none;
    }

    .multi-select-indicator svg {
      width: 100%;
      height: 100%;
    }

    .multi-select-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: multi-select-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes multi-select-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .multi-select-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class SelectMultipleExample {
  protected readonly options: readonly Option[] = [
    { value: 'angular', label: 'Angular' },
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'svelte', label: 'Svelte' },
    { value: 'solid', label: 'Solid' },
  ];

  protected readonly value = signal<readonly string[]>([]);
}
