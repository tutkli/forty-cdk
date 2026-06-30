import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  ForSelect,
  ForSelectContent,
  ForSelectGroup,
  ForSelectGroupLabel,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectSeparator,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';

interface Option {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-select-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForSelectIndicator,
    ForSelectGroup,
    ForSelectGroupLabel,
    ForSelectSeparator,
  ],
  template: `
    <div
      forSelect
      #select="forSelect"
      class="select-field"
      [(value)]="value"
      placeholder="Pick your stack"
      ariaLabel="Tech stack"
    >
      <button forSelectTrigger type="button" class="select-trigger">
        <span forSelectValue></span>
        <svg class="select-chevron" viewBox="0 0 24 24" aria-hidden="true">
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
        <div forSelectContent class="select-content" animate.enter="select-pop-in">
          <div forSelectGroup>
            <div forSelectGroupLabel class="select-group-label">Frontend</div>
            @for (opt of frontend; track opt.value) {
              <button
                forSelectOption
                type="button"
                class="select-option"
                [value]="opt.value"
                [disabled]="opt.disabled ?? false"
              >
                <span forSelectIndicator class="select-indicator">
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

          <hr forSelectSeparator class="select-separator" />

          <div forSelectGroup>
            <div forSelectGroupLabel class="select-group-label">Backend</div>
            @for (opt of backend; track opt.value) {
              <button
                forSelectOption
                type="button"
                class="select-option"
                [value]="opt.value"
                [disabled]="opt.disabled ?? false"
              >
                <span forSelectIndicator class="select-indicator">
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
        </div>
      }
    </div>
  `,
  styles: `
    app-select-default-example {
      display: contents;
    }

    .select-field {
      display: block;
      width: min(260px, 100%);
    }

    .select-trigger {
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

    .select-trigger:hover {
      background: var(--pg-surface-2);
    }

    .select-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .select-trigger[aria-expanded='true'] .select-chevron {
      transform: rotate(180deg);
    }

    .select-content {
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

    .select-option {
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

    .select-option[data-highlighted],
    .select-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .select-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .select-option[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .select-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .select-indicator[hidden] {
      display: none;
    }

    .select-indicator svg {
      width: 100%;
      height: 100%;
    }

    .select-group-label {
      padding: 0.35rem 0.6rem 0.2rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pg-text-muted);
    }

    .select-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--pg-border);
    }

    .select-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: select-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes select-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .select-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class SelectDefaultExample {
  protected readonly frontend: readonly Option[] = [
    { value: 'angular', label: 'Angular' },
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'svelte', label: 'Svelte', disabled: true },
  ];

  protected readonly backend: readonly Option[] = [
    { value: 'node', label: 'Node.js' },
    { value: 'deno', label: 'Deno' },
    { value: 'bun', label: 'Bun' },
  ];

  protected readonly value = signal<readonly string[]>([]);
}
