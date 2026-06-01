import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForSwitch } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

interface Consent {
  readonly privacy: boolean;
}

@Component({
  selector: 'app-switch-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, FormField, ForSwitch],
  template: `
    <playground-demo
      title="Signal Forms"
      subtitle="forSwitch implements FormCheckboxControl from @angular/forms/signals, so a single [formField] binding wires the checked state, validation status and touched flag both ways — no ControlValueAccessor. This consent switch is required: once you blur it while still off, the field is invalid and the knob reflects data-invalid / data-touched."
      sourcePath="projects/forty-cdk-playground/src/app/demos/switch/examples/form-field.example.ts"
    >
      <div demo class="sw-form">
        <div class="sw-row">
          <button
            forSwitch
            class="sw-btn"
            [formField]="consentForm.privacy"
            aria-label="Accept the privacy policy"
          >
            <span class="sw-thumb"></span>
          </button>
          <span class="sw-text">I accept the privacy policy</span>
        </div>
        @if (consentForm.privacy().touched() && !consentForm.privacy().valid()) {
          <p class="sw-error">You must accept the privacy policy to continue.</p>
        }
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          checked: <b>{{ consentForm.privacy().value() }}</b
          ><br />
          valid: <b>{{ consentForm.privacy().valid() }}</b
          ><br />
          touched: <b>{{ consentForm.privacy().touched() }}</b
          ><br />
          errors: <b>{{ errorKinds() || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .sw-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .sw-row {
      display: inline-flex;
      align-items: center;
      gap: 0.8rem;
    }

    .sw-text {
      font-weight: 500;
    }

    .sw-btn {
      position: relative;
      width: 46px;
      height: 26px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: var(--pg-border-strong);
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .sw-btn[data-state='checked'] {
      background: var(--pg-primary);
    }

    .sw-btn[data-touched][data-invalid] {
      outline: 2px solid #ef4444;
      outline-offset: 3px;
    }

    .sw-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s ease;
    }

    .sw-btn[data-state='checked'] .sw-thumb {
      transform: translateX(20px);
    }

    .sw-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }

    @media (prefers-reduced-motion: reduce) {
      .sw-btn,
      .sw-thumb {
        transition: none;
      }
    }
  `,
})
export class SwitchFormFieldExample {
  protected readonly model = signal<Consent>({ privacy: false });
  protected readonly consentForm = form(this.model, (path) => {
    validate(path.privacy, (ctx) =>
      ctx.value() ? undefined : requiredError({ message: 'Accept the privacy policy' }),
    );
  });

  protected errorKinds(): string {
    return this.consentForm
      .privacy()
      .errors()
      .map((error) => error.kind)
      .join(', ');
  }
}
