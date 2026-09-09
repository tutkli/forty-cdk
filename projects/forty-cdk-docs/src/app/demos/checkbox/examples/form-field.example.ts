import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForCheckbox } from 'forty-cdk/checkbox';

interface Signup {
  readonly terms: boolean;
}

@Component({
  selector: 'app-checkbox-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForCheckbox],
  template: `
    <div class="cb-form">
      <button
        forCheckbox
        class="cb-row"
        [formField]="signupForm.terms"
        aria-label="Accept the terms of service"
      >
        <span class="cb">
          <span class="cb-check" aria-hidden="true"></span>
        </span>
        I accept the terms of service
      </button>
      @if (signupForm.terms().touched() && !signupForm.terms().valid()) {
        <p class="cb-error">You must accept the terms to create an account.</p>
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

    .cb-row[data-touched][data-invalid] .cb {
      border-color: #ef4444;
    }

    .cb-check {
      display: none;
      width: 12px;
      height: 12px;
      border: solid var(--pg-primary-contrast);
      border-width: 0 2.5px 2.5px 0;
      transform: rotate(45deg) translate(-1px, -1px);
    }

    .cb-row[data-state='checked'] .cb-check {
      display: block;
    }

    .cb-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
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
    validate(path.terms, (ctx) =>
      ctx.value() ? undefined : requiredError({ message: 'Accept the terms' }),
    );
  });
}
