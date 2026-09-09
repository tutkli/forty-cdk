import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForCheckbox } from 'forty-cdk/checkbox';
import { ForField, ForFieldDescription, ForFieldError } from 'forty-cdk/field';

interface Signup {
  readonly terms: boolean;
}

@Component({
  selector: 'app-field-validation-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForCheckbox, ForField, ForFieldDescription, ForFieldError],
  template: `
    <div forField class="field">
      <button
        forCheckbox
        class="cb-row"
        [formField]="signupForm.terms"
        aria-label="Accept the terms of service"
      >
        <span class="cb">
          <svg class="cb-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
        </span>
        <span class="cb-label">I accept the terms of service</span>
      </button>
      <p forFieldDescription class="field-desc">You can withdraw consent at any time.</p>
      @if (signupForm.terms().touched() && !signupForm.terms().valid()) {
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
      gap: 0.5rem;
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
      font-weight: 500;
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
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .cb-row[data-state='checked'] .cb {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
    }

    .field[data-touched][data-invalid] .cb {
      border-color: #ef4444;
    }

    .cb-icon {
      display: none;
      width: 14px;
      height: 14px;
      color: var(--pg-primary-contrast);
    }

    .cb-row[data-state='checked'] .cb-icon {
      display: block;
    }

    .field-desc {
      margin: 0;
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }

    .field-error {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 500;
      color: #ef4444;
    }

    @media (prefers-reduced-motion: reduce) {
      .cb {
        transition: none;
      }
    }
  `,
})
export class FieldValidationExample {
  protected readonly model = signal<Signup>({ terms: false });
  protected readonly signupForm = form(this.model, (path) => {
    validate(path.terms, (ctx) =>
      ctx.value() ? undefined : requiredError({ message: 'You must accept the terms to continue' }),
    );
  });
}
