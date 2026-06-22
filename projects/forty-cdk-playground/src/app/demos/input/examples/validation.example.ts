import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { ForField, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForInput } from 'forty-cdk/input';

import { DemoLayout } from '../../../ui/demo-layout';

interface Account {
  readonly email: string;
}

@Component({
  selector: 'app-input-validation-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, FormField, ForField, ForLabel, ForInput, ForFieldError],
  template: `
    <playground-demo
      title="Signal Forms validation"
      subtitle="Bound through [formField], forInput auto-associates inside forField — the label adopts the control id, errors flow into aria-errormessage, and touched / invalid are reflected with no manual id plumbing. Type an invalid address and blur to surface the error."
      sourcePath="projects/forty-cdk-playground/src/app/demos/input/examples/validation.example.ts"
    >
      <div demo>
        <div forField #field="forField" class="field">
          <label forLabel class="field-label">
            <span class="field-label-text">Work email</span>
            <input forInput class="pg-input" type="email" [formField]="accountForm.email" />
          </label>
          @if (accountForm.email().touched() && !accountForm.email().valid()) {
            <p forFieldError #err="forFieldError" class="field-error">
              {{ err.messages().join(', ') }}
            </p>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <button type="button" class="pg-btn" (click)="accountForm.email().markAsTouched()">
          Mark touched
        </button>
        <p class="pg-state">
          value: <b>{{ accountForm.email().value() || '∅' }}</b
          ><br />
          touched: <b>{{ field.touched() }}</b
          ><br />
          invalid: <b>{{ field.invalid() }}</b
          ><br />
          aria-errormessage: <b>{{ field.errorMessageId() ?? '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .field {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .field-label {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .field-label-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--pg-text);
    }

    .field[data-touched][data-invalid] .pg-input {
      border-color: var(--pg-danger);
    }

    .field-error {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--pg-danger);
    }
  `,
})
export class InputValidationExample {
  protected readonly model = signal<Account>({ email: '' });
  protected readonly accountForm = form(this.model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
  });
}
