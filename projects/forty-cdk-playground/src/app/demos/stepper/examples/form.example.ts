import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  email,
  type FieldTree,
  form,
  FormField,
  minLength,
  required,
} from '@angular/forms/signals';
import {
  ForField,
  ForFieldError,
  ForInput,
  ForLabel,
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
} from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

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
    DemoLayout,
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
    <playground-demo
      title="Linear wizard with Signal Forms"
      subtitle="Each step binds a Signal Forms field. A step is completed when its field is valid and touched, and shows the error state when touched and invalid — no manual [completed] wiring. In linear mode Next stays disabled until the current step's field is valid and touched, so fill the input and blur it to advance."
      sourcePath="projects/forty-cdk-playground/src/app/demos/stepper/examples/form.example.ts"
    >
      <div demo class="stp-demo">
        <div forStepper #stepper="forStepper" class="stp" [(selectedIndex)]="step" [linear]="true">
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
                  <input forInput class="pg-input" type="email" [formField]="signupForm.email" />
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
                  <input
                    forInput
                    class="pg-input"
                    type="password"
                    [formField]="signupForm.password"
                  />
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
                  <input forInput class="pg-input" type="text" [formField]="signupForm.name" />
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
              <button type="button" class="pg-btn" (click)="restart()">Start over</button>
            </section>

            <div class="stp-nav">
              <button forStepperPrevious type="button" class="pg-btn">Back</button>
              <button forStepperNext type="button" class="pg-btn stp-next">Next</button>
            </div>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-hint">
          Linear mode gates forward navigation: a step is only reachable once every preceding step is
          completed. The Signal Forms field decides completion, so Next enables as soon as the current
          field becomes valid and touched.
        </p>
        <p class="pg-state">
          selectedIndex: <b>{{ step() }}</b
          ><br />
          canAdvance: <b>{{ stepper.canAdvance() }}</b
          ><br />
          isCompleted: <b>{{ stepper.isCompleted() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
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
      border-radius: var(--pg-radius-sm);
      color: var(--pg-text-muted);
      cursor: pointer;
      white-space: nowrap;
    }

    .stp-trigger[aria-disabled='true'] {
      cursor: not-allowed;
    }

    .stp-trigger[data-state='active'],
    .stp-trigger[data-state='completed'] {
      color: var(--pg-text);
    }

    .stp-trigger[data-state='error'] {
      color: var(--pg-danger);
    }

    .stp-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 50%;
      border: 2px solid var(--pg-border-strong);
      background: var(--pg-surface);
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--pg-text-muted);
    }

    .stp-indicator[data-state='active'] {
      border-color: var(--pg-primary);
      color: var(--pg-primary);
    }

    .stp-indicator[data-state='completed'] {
      border-color: var(--pg-primary);
      background: var(--pg-primary);
      color: var(--pg-on-primary, #fff);
    }

    .stp-indicator[data-state='error'] {
      border-color: var(--pg-danger);
      background: var(--pg-danger);
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
      background: var(--pg-border);
    }

    .stp-sep[data-state='completed'] {
      background: var(--pg-primary);
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
      color: var(--pg-text);
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

    .stp-nav {
      display: flex;
      gap: 0.6rem;
    }

    .stp-next {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-on-primary, #fff);
    }

    .pg-btn[aria-disabled='true'] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .pg-hint {
      margin: 0 0 1rem;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
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
