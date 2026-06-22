import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForCheckbox } from 'forty-cdk/checkbox';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface Signup {
  readonly terms: boolean;
}

@Component({
  selector: 'app-checkbox-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, FormField, ForCheckbox, Icon],
  template: `
    <playground-demo
      title="Signal Forms"
      subtitle="forCheckbox implements FormCheckboxControl, so [formField] binds its binary checked value into the form and pulls validation back out — indeterminate stays a UI-only flag and never reaches the field. The box below is required; after you blur it unchecked it reflects data-invalid / data-touched and the error appears."
      sourcePath="projects/forty-cdk-playground/src/app/demos/checkbox/examples/form-field.example.ts"
    >
      <div demo class="cb-form">
        <button
          forCheckbox
          class="cb-row"
          [formField]="signupForm.terms"
          aria-label="Accept the terms of service"
        >
          <span class="cb">
            <app-icon class="cb-icon cb-check" name="check" [strokeWidth]="2.5" />
          </span>
          I accept the terms of service
        </button>
        @if (signupForm.terms().touched() && !signupForm.terms().valid()) {
          <p class="cb-error">You must accept the terms to create an account.</p>
        }
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          checked: <b>{{ signupForm.terms().value() }}</b
          ><br />
          valid: <b>{{ signupForm.terms().valid() }}</b
          ><br />
          touched: <b>{{ signupForm.terms().touched() }}</b
          ><br />
          errors: <b>{{ errorKinds() || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .cb-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .cb-row {
      display: inline-flex;
      align-items: center;
      align-self: flex-start;
      gap: 0.6rem;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--pg-text);
      cursor: pointer;
    }

    .cb {
      flex: none;
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border: 2px solid var(--pg-border-strong);
      border-radius: 6px;
      background: var(--pg-surface);
      color: var(--pg-primary-contrast);
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .cb-row[data-state='checked'] .cb {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
    }

    .cb-row[data-touched][data-invalid] .cb {
      border-color: #ef4444;
    }

    .cb .cb-icon {
      display: none;
    }

    .cb-row[data-state='checked'] .cb-check {
      display: block;
      width: 14px;
      height: 14px;
    }

    .cb-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }
  `,
})
export class CheckboxFormFieldExample {
  protected readonly model = signal<Signup>({ terms: false });
  protected readonly signupForm = form(this.model, (path) => {
    validate(path.terms, (ctx) =>
      ctx.value() ? undefined : requiredError({ message: 'Accept the terms' }),
    );
  });

  protected errorKinds(): string {
    return this.signupForm
      .terms()
      .errors()
      .map((error) => error.kind)
      .join(', ');
  }
}
