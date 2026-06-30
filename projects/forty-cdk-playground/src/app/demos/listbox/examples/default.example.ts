import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForListbox, ForListboxOption, ForListboxOptionIndicator } from 'forty-cdk/listbox';

interface Option {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-listbox-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption, ForListboxOptionIndicator],
  template: `
    <ul forListbox class="listbox" [(value)]="value" aria-label="Languages">
      @for (opt of options; track opt.value) {
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
export class ListboxDefaultExample {
  protected readonly options: readonly Option[] = [
    { value: 'ts', label: 'TypeScript' },
    { value: 'js', label: 'JavaScript' },
    { value: 'py', label: 'Python' },
    { value: 'rust', label: 'Rust' },
    { value: 'go', label: 'Go' },
    { value: 'ruby', label: 'Ruby', disabled: true },
    { value: 'kotlin', label: 'Kotlin' },
  ];

  protected readonly value = signal<readonly string[]>([]);
}
