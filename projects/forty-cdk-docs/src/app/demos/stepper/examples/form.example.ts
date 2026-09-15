import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  email,
  type FieldTree,
  form,
  FormField,
  minLength,
  required,
} from '@angular/forms/signals';
import { ForField, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForInput } from 'forty-cdk/input';
import {
  ForStepper,
  ForStepperCompletedContent,
  ForStepperContent,
  ForStepperIndicator,
  ForStepperItem,
  ForStepperList,
  ForStepperNext,
  ForStepperPrevious,
  ForStepperSeparator,
  ForStepperTrigger,
} from 'forty-cdk/stepper';

interface Signup {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

interface FormStep {
  readonly label: string;
  readonly field: FieldTree<unknown>;
}

@Component({
  selector: 'app-stepper-form-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    ForField,
    ForLabel,
    ForInput,
    ForFieldError,
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperIndicator,
    ForStepperSeparator,
    ForStepperContent,
    ForStepperCompletedContent,
    ForStepperNext,
    ForStepperPrevious,
  ],
  template: `
    <div class="stp-demo">
      <div forStepper class="stp" [(selectedIndex)]="step" [linear]="true">
        <ol forStepperList class="stp-list" ariaLabel="Create account">
          @for (s of formSteps; track s.label; let i = $index; let last = $last) {
            <li forStepperItem #item="forStepperItem" class="stp-item" [field]="s.field">
              <button forStepperTrigger type="button" class="stp-trigger">
                <span forStepperIndicator class="stp-indicator">
                  @if (item.resolvedState() === 'completed') {
                    ✓
                  } @else if (item.resolvedState() === 'error') {
                    !
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
                <span class="stp-label">{{ s.label }}</span>
              </button>
              @if (!last) {
                <span forStepperSeparator class="stp-sep"></span>
              }
            </li>
          }
        </ol>

        <div class="stp-body">
          <section forStepperContent class="stp-panel">
            <div forField #emailField="forField" class="field">
              <label forLabel class="field-label">
                <span class="field-label-text">Work email</span>
                <input forInput class="input" type="email" [formField]="signupForm.email" />
              </label>
              @if (emailField.touched() && emailField.invalid()) {
                <p forFieldError #emailErr="forFieldError" class="field-error">
                  {{ emailErr.messages().join(', ') }}
                </p>
              }
            </div>
          </section>

          <section forStepperContent class="stp-panel">
            <div forField #passwordField="forField" class="field">
              <label forLabel class="field-label">
                <span class="field-label-text">Password</span>
                <input forInput class="input" type="password" [formField]="signupForm.password" />
              </label>
              @if (passwordField.touched() && passwordField.invalid()) {
                <p forFieldError #passwordErr="forFieldError" class="field-error">
                  {{ passwordErr.messages().join(', ') }}
                </p>
              }
            </div>
          </section>

          <section forStepperContent class="stp-panel">
            <div forField #nameField="forField" class="field">
              <label forLabel class="field-label">
                <span class="field-label-text">Display name</span>
                <input forInput class="input" type="text" [formField]="signupForm.name" />
              </label>
              @if (nameField.touched() && nameField.invalid()) {
                <p forFieldError #nameErr="forFieldError" class="field-error">
                  {{ nameErr.messages().join(', ') }}
                </p>
              }
            </div>
          </section>

          <section forStepperCompletedContent class="stp-panel stp-complete">
            <p>✅ Account created — welcome aboard.</p>
            <button type="button" class="btn" (click)="restart()">Start over</button>
          </section>

          <div class="stp-nav">
            <button forStepperPrevious type="button" class="btn">Back</button>
            <button forStepperNext type="button" class="btn btn-next">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stp-demo {
      width: min(520px, 100%);
    }

    .stp {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stp-list {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .stp-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .stp-item:not(:last-child) {
      flex: 1;
    }

    .stp-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      font: inherit;
      padding: 0.3rem;
      background: transparent;
      border: 0;
      border-radius: var(--ex-radius-sm, 14px);
      color: var(--ex-muted, #585d66);
      cursor: pointer;
      white-space: nowrap;
    }

    .stp-trigger[aria-disabled='true'] {
      cursor: not-allowed;
    }

    .stp-trigger[data-state='active'],
    .stp-trigger[data-state='completed'] {
      color: var(--ex-text, #17191c);
    }

    .stp-trigger[data-state='error'] {
      color: var(--ex-danger, #b3261e);
    }

    .stp-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 50%;
      border: 2px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--ex-muted, #585d66);
    }

    .stp-indicator[data-state='active'] {
      border-color: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent, #0e7c6b);
    }

    .stp-indicator[data-state='completed'] {
      border-color: var(--ex-accent, #0e7c6b);
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .stp-indicator[data-state='error'] {
      border-color: var(--ex-danger, #b3261e);
      background: var(--ex-danger, #b3261e);
      color: #fff;
    }

    .stp-label {
      font-size: 0.92rem;
      font-weight: 600;
    }

    .stp-sep {
      flex: 1;
      height: 2px;
      min-width: 1rem;
      border-radius: 2px;
      background: var(--ex-border, #e5e0d6);
    }

    .stp-sep[data-state='completed'] {
      background: var(--ex-accent, #0e7c6b);
    }

    .stp-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 0;
    }

    .stp-panel[data-state='inactive'] {
      display: none;
    }

    .stp-complete {
      color: var(--ex-text, #17191c);
    }

    .stp-complete p {
      margin: 0 0 0.75rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      width: min(340px, 100%);
    }

    .field-label {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .field-label-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ex-text, #17191c);
    }

    .input {
      width: 100%;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.5rem 0.7rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
    }

    .field[data-touched][data-invalid] .input {
      border-color: var(--ex-danger, #b3261e);
    }

    .field-error {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--ex-danger, #b3261e);
    }

    .stp-nav {
      display: flex;
      gap: 0.6rem;
    }

    .btn {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .btn[aria-disabled='true'] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .btn-next,
    .btn-next:hover {
      background: var(--ex-accent, #0e7c6b);
      border-color: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .btn-next:hover {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }
  `,
})
export class StepperFormExample {
  protected readonly step = signal(0);

  protected readonly model = signal<Signup>({ email: '', password: '', name: '' });

  protected readonly signupForm = form(this.model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
    required(path.password, { message: 'Password is required' });
    minLength(path.password, 8, { message: 'Use at least 8 characters' });
    required(path.name, { message: 'Display name is required' });
  });

  protected readonly formSteps: readonly FormStep[] = [
    { label: 'Account', field: this.signupForm.email },
    { label: 'Security', field: this.signupForm.password },
    { label: 'Profile', field: this.signupForm.name },
  ];

  protected restart(): void {
    this.model.set({ email: '', password: '', name: '' });
    this.step.set(0);
  }
}
