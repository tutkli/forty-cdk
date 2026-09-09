import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForListbox, ForListboxOption, ForListboxOptionIndicator } from 'forty-cdk/listbox';

interface Prefs {
  readonly topics: readonly string[];
}

@Component({
  selector: 'app-listbox-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForListbox, ForListboxOption, ForListboxOptionIndicator],
  template: `
    <ul forListbox multiple class="listbox" [formField]="prefsForm.topics" aria-label="Topics">
      @for (topic of topics; track topic.value) {
        <li>
          <button type="button" forListboxOption class="listbox-option" [value]="topic.value">
            {{ topic.label }}
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

    .listbox[data-invalid][data-touched] {
      border-color: var(--pg-danger);
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
export class ListboxFormFieldExample {
  protected readonly topics: readonly { value: string; label: string }[] = [
    { value: 'angular', label: 'Angular' },
    { value: 'signals', label: 'Signals' },
    { value: 'a11y', label: 'Accessibility' },
    { value: 'forms', label: 'Forms' },
    { value: 'testing', label: 'Testing' },
  ];

  protected readonly model = signal<Prefs>({ topics: [] });
  protected readonly prefsForm = form(this.model, (path) => {
    validate(path.topics, (ctx) =>
      ctx.value().length === 0
        ? requiredError({ message: 'Choose at least one topic' })
        : undefined,
    );
  });
}
