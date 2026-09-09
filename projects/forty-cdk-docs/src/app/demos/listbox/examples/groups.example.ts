import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForListbox,
  ForListboxGroup,
  ForListboxGroupLabel,
  ForListboxOption,
  ForListboxOptionIndicator,
} from 'forty-cdk/listbox';

interface Section {
  readonly label: string;
  readonly options: readonly { value: string; label: string; disabled?: boolean }[];
}

@Component({
  selector: 'app-listbox-groups-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForListbox,
    ForListboxGroup,
    ForListboxGroupLabel,
    ForListboxOption,
    ForListboxOptionIndicator,
  ],
  template: `
    <ul forListbox multiple class="listbox" [(value)]="value" aria-label="Timezone">
      @for (section of sections; track section.label) {
        <li forListboxGroup class="group">
          <span forListboxGroupLabel class="group-label">{{ section.label }}</span>
          <ul class="group-options">
            @for (opt of section.options; track opt.value) {
              <li>
                <button
                  type="button"
                  forListboxOption
                  class="listbox-option"
                  [value]="opt.value"
                  [disabled]="opt.disabled ?? false"
                >
                  {{ opt.label }}
                  <span forListboxOptionIndicator class="listbox-indicator">
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
                </button>
              </li>
            }
          </ul>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: contents;
    }

    .listbox {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: min(300px, 100%);
      margin: 0;
      padding: 5px;
      list-style: none;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .listbox > li {
      display: contents;
    }

    .group {
      display: contents;
    }

    .group-label {
      display: block;
      padding: 0.4rem 0.65rem 0.2rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pg-text-muted);
    }

    .group-options {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0 0 0.35rem;
      padding: 0;
      list-style: none;
    }

    .group-options > li {
      display: contents;
    }

    .listbox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      padding: 0.5rem 0.65rem;
      border: 0;
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text);
      cursor: pointer;
    }

    .listbox-option[data-highlighted] {
      background: var(--pg-surface-2);
    }

    .listbox-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .listbox-option[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .listbox-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      margin-left: auto;
      color: var(--pg-primary);
    }

    .listbox-indicator svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class ListboxGroupsExample {
  protected readonly sections: readonly Section[] = [
    {
      label: 'Americas',
      options: [
        { value: 'pst', label: 'Pacific (PST)' },
        { value: 'est', label: 'Eastern (EST)' },
        { value: 'art', label: 'Buenos Aires (ART)' },
      ],
    },
    {
      label: 'Europe',
      options: [
        { value: 'gmt', label: 'London (GMT)' },
        { value: 'cet', label: 'Central Europe (CET)' },
        { value: 'msk', label: 'Moscow (MSK)', disabled: true },
      ],
    },
    {
      label: 'Asia / Pacific',
      options: [
        { value: 'ist', label: 'India (IST)' },
        { value: 'jst', label: 'Tokyo (JST)' },
        { value: 'aest', label: 'Sydney (AEST)' },
      ],
    },
  ];

  protected readonly value = signal<readonly string[]>([]);
}
