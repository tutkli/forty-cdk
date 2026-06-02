import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForCheckbox, ForField, ForFieldDescription, ForFieldError } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface Signup {
  readonly terms: boolean;
}

@Component({
  selector: 'app-field-validation-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, FormField, ForCheckbox, ForField, ForFieldDescription, ForFieldError, Icon],
  template: `
    <playground-demo
      title="Validation with Signal Forms"
      subtitle="forFieldError reads the control's Signal Forms errors automatically — you render err.messages(), the field wires aria-errormessage and folds the id into aria-describedby while invalid. The checkbox auto-associates because it extends the shared form base; no manual id plumbing. Mark the field touched (or blur it unchecked) to surface the required error."
      sourcePath="projects/forty-cdk-playground/src/app/demos/field/examples/validation.example.ts"
    >
      <div demo>
        <div forField #field="forField" class="field">
          <button forCheckbox class="cb-row" [formField]="signupForm.terms" aria-label="Accept the terms of service">
            <span class="cb">
              <app-icon class="cb-icon" name="check" [strokeWidth]="2.5" />
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
      </div>

      <div controls class="pg-controls">
        <button type="button" class="action" (click)="signupForm.terms().markAsTouched()">
          Mark touched
        </button>
        <p class="pg-state">
          checked: <b>{{ signupForm.terms().value() }}</b
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

    .action {
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.45rem 0.7rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
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
