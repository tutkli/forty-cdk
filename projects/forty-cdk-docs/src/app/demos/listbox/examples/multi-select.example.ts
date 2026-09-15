import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForListbox, ForListboxOption, ForListboxOptionIndicator } from 'forty-cdk/listbox';

interface Option {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-listbox-multi-select-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForListbox, ForListboxOption, ForListboxOptionIndicator],
  template: `
    <ul forListbox multiple class="listbox" [(value)]="value" aria-label="Languages">
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
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
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
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .listbox-option[data-highlighted] {
      background: var(--ex-surface-2, #f2eee6);
    }

    .listbox-option[data-state='checked'] {
      color: var(--ex-accent, #0e7c6b);
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
      color: var(--ex-accent, #0e7c6b);
    }

    .listbox-indicator svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class ListboxMultiSelectExample {
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
