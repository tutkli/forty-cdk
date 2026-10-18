import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForField, ForFieldError } from 'forty-cdk/field';
import { ForSwitch } from 'forty-cdk/switch';

interface Consent {
  readonly privacy: boolean;
}

@Component({
  selector: 'app-switch-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, ForSwitch, ForField, ForFieldError],
  template: `
    <div forField class="form">
      <div class="row">
        <button
          forSwitch
          class="switch"
          [formField]="consentForm.privacy"
          aria-labelledby="sw-privacy-label"
        >
          <span class="thumb"></span>
        </button>
        <span id="sw-privacy-label" class="text">I accept the privacy policy</span>
      </div>
      @if (consentForm.privacy().touched() && !consentForm.privacy().valid()) {
        <p forFieldError #err="forFieldError" class="error">{{ err.messages().join(', ') }}</p>
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
      background: var(--ex-border-strong, #d0c9bc);
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .switch[data-state='checked'] {
      background: var(--ex-accent, #0e7c6b);
    }

    .switch[data-touched][data-invalid] {
      outline: 2px solid var(--ex-danger, #b3261e);
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
      color: var(--ex-danger, #b3261e);
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
      ctx.value()
        ? undefined
        : requiredError({ message: 'You must accept the privacy policy to continue.' }),
    );
  });
}
