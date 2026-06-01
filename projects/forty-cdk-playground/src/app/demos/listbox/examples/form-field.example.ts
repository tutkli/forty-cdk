import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForListbox, ForListboxOption, ForListboxOptionIndicator } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface Prefs {
  readonly topics: readonly string[];
}

@Component({
  selector: 'app-listbox-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, FormField, ForListbox, ForListboxOption, ForListboxOptionIndicator, Icon],
  template: `
    <playground-demo
      title="Signal Forms"
      subtitle="forListbox implements FormValueControl<readonly T[]> from @angular/forms/signals, so a multi-select binds to a form field with one [formField] directive — the readonly-array value model is exactly the multi-capable shape the form contract wants. The field below requires at least one topic; the listbox reflects data-invalid until then and flips touched once focus leaves it."
      sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/form-field.example.ts"
    >
      <div demo class="listbox-demo">
        <ul
          forListbox
          multiple
          class="pg-listbox"
          [formField]="prefsForm.topics"
          aria-label="Topics"
        >
          @for (topic of topics; track topic.value) {
            <li>
              <button
                type="button"
                forListboxOption
                class="pg-listbox-option"
                [value]="topic.value"
              >
                {{ topic.label }}
                <span forListboxOptionIndicator class="pg-listbox-indicator">
                  <app-icon name="check" />
                </span>
              </button>
            </li>
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          value: <b>{{ prefsForm.topics().value().join(', ') || '—' }}</b
          ><br />
          valid: <b>{{ prefsForm.topics().valid() }}</b
          ><br />
          touched: <b>{{ prefsForm.topics().touched() }}</b
          ><br />
          errors: <b>{{ errorKinds() || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .listbox-demo {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0;
      width: 100%;
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

  protected errorKinds(): string {
    return this.prefsForm
      .topics()
      .errors()
      .map((error) => error.kind)
      .join(', ');
  }
}
