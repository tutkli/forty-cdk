import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { ForCheckbox } from 'forty-cdk/checkbox';
import { ForField, ForFieldError } from 'forty-cdk/field';

interface Signup {
  readonly terms: boolean;
}

@Component({
  selector: 'app-checkbox-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForCheckbox, ForField, ForFieldError],
  template: `
    <div forField class="cb-form">
      <button forCheckbox class="cb-row" [formField]="signupForm.terms">
        <span class="cb">
          <span class="cb-check" aria-hidden="true"></span>
        </span>
        I accept the terms of service
      </button>
      @if (signupForm.terms().touched() && !signupForm.terms().valid()) {
        <p forFieldError #err="forFieldError" class="cb-error">{{ err.messages().join(', ') }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

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
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .cb {
      flex: none;
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border: 2px solid var(--ex-border-strong, #d0c9bc);
      border-radius: 6px;
      background: var(--ex-surface, #ffffff);
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .cb-row[data-state='checked'] .cb {
      background: var(--ex-accent, #0e7c6b);
      border-color: var(--ex-accent, #0e7c6b);
    }

    .cb-row[data-touched][data-invalid] .cb {
      border-color: var(--ex-danger, #b3261e);
    }

    .cb-check {
      display: none;
      width: 6px;
      height: 12px;
      border: solid var(--ex-accent-contrast, #ffffff);
      border-width: 0 2.5px 2.5px 0;
      transform: rotate(45deg) translate(-1px, -1px);
    }

    .cb-row[data-state='checked'] .cb-check {
      display: block;
    }

    .cb-error {
      margin: 0;
      font-size: 0.85rem;
      color: var(--ex-danger, #b3261e);
    }

    @media (prefers-reduced-motion: reduce) {
      .cb {
        transition: none;
      }
    }
  `,
})
export class CheckboxFormFieldExample {
  protected readonly model = signal<Signup>({ terms: false });
  protected readonly signupForm = form(this.model, (path) => {
    required(path.terms, { message: 'You must accept the terms to create an account.' });
  });
}
