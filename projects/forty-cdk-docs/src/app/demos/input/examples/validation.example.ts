import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { ForField, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForInput } from 'forty-cdk/input';

interface Account {
  readonly email: string;
}

@Component({
  selector: 'app-input-validation-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForField, ForLabel, ForInput, ForFieldError],
  template: `
    <div forField class="field">
      <label forLabel class="field-label">
        <span class="field-label-text">Work email</span>
        <input forInput class="input" type="email" [formField]="accountForm.email" />
      </label>
      @if (accountForm.email().touched() && !accountForm.email().valid()) {
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

    .input {
      width: 100%;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.5rem 0.7rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
    }

    .field[data-touched][data-invalid] .input {
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
