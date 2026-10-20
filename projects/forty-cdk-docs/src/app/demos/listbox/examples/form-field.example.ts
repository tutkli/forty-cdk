import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, required, requiredError, validate } from '@angular/forms/signals';
import { ForField, ForFieldError } from 'forty-cdk/field';
import { ForListbox, ForListboxOption, ForListboxOptionIndicator } from 'forty-cdk/listbox';

interface Prefs {
  readonly topics: readonly string[];
}

@Component({
  selector: 'app-listbox-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    ForField,
    ForFieldError,
    ForListbox,
    ForListboxOption,
    ForListboxOptionIndicator,
  ],
  template: `
    <div forField class="field">
      <div forListbox multiple class="listbox" [formField]="prefsForm.topics" aria-label="Topics">
        @for (topic of topics; track topic.value) {
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
        }
      </div>
      @if (prefsForm.topics().touched() && !prefsForm.topics().valid()) {
        <p forFieldError #err="forFieldError" class="field-error">
          {{ err.messages().join(', ') }}
        </p>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .listbox {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: min(300px, 100%);
      margin: 0;
      padding: 5px;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
    }

    .listbox[data-invalid][data-touched] {
      border-color: var(--ex-danger, #b3261e);
    }

    .field-error {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ex-danger, #b3261e);
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

    .listbox:is(:focus-within, :hover) .listbox-option[data-highlighted] {
      background: var(--ex-surface-2, #f2eee6);
    }

    .listbox-option[data-state='checked'] {
      color: var(--ex-accent, #0e7c6b);
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
      color: var(--ex-accent, #0e7c6b);
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
    required(path.topics);
    validate(path.topics, (ctx) =>
      ctx.value().length === 0
        ? requiredError({ message: 'Choose at least one topic.' })
        : undefined,
    );
  });
}
