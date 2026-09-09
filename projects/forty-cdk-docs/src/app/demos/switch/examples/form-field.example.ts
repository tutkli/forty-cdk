import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForSwitch } from 'forty-cdk/switch';

interface Consent {
  readonly privacy: boolean;
}

@Component({
  selector: 'app-switch-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForSwitch],
  template: `
    <div class="form">
      <div class="row">
        <button
          forSwitch
          class="switch"
          [formField]="consentForm.privacy"
          aria-label="Accept the privacy policy"
        >
          <span class="thumb"></span>
        </button>
        <span class="text">I accept the privacy policy</span>
      </div>
      @if (consentForm.privacy().touched() && !consentForm.privacy().valid()) {
        <p class="error">You must accept the privacy policy to continue.</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .row {
      display: inline-flex;
      align-items: center;
      gap: 0.8rem;
    }

    .text {
      font-weight: 500;
    }

    .switch {
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

    .switch[data-state='checked'] {
      background: var(--pg-primary);
    }

    .switch[data-touched][data-invalid] {
      outline: 2px solid #ef4444;
      outline-offset: 3px;
    }

    .thumb {
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

    .switch[data-state='checked'] .thumb {
      transform: translateX(20px);
    }

    .error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }

    @media (prefers-reduced-motion: reduce) {
      .switch,
      .thumb {
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
}
