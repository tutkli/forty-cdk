import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import { ForRadio, ForRadioGroup } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

interface Checkout {
  readonly shipping: string;
}

@Component({
  selector: 'app-radio-group-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, FormField, ForRadioGroup, ForRadio],
  template: `
    <playground-demo
      title="Signal Forms"
      subtitle="forRadioGroup implements FormValueControl<string>, so [formField] binds the selected value into the form and surfaces validity back. The empty string is the canonical 'nothing selected'. This field is required: tab through without choosing and the group reflects data-invalid / data-touched once focus leaves it."
      sourcePath="projects/forty-cdk-playground/src/app/demos/radio-group/examples/form-field.example.ts"
    >
      <div demo class="rg-form">
        <span id="rgf-label" class="rg-label">Shipping method</span>
        <div forRadioGroup class="rg" [formField]="checkoutForm.shipping" aria-labelledby="rgf-label">
          @for (opt of options; track opt.value) {
            <button type="button" forRadio class="rg-option" [value]="opt.value">
              <span class="rg-dot"></span>
              {{ opt.label }}
            </button>
          }
        </div>
        @if (checkoutForm.shipping().touched() && !checkoutForm.shipping().valid()) {
          <p class="rg-error">Choose a shipping method.</p>
        }
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          value: <b>{{ checkoutForm.shipping().value() || '—' }}</b
          ><br />
          valid: <b>{{ checkoutForm.shipping().valid() }}</b
          ><br />
          touched: <b>{{ checkoutForm.shipping().touched() }}</b
          ><br />
          errors: <b>{{ errorKinds() || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .rg-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .rg-label {
      font-weight: 600;
    }

    .rg {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      align-self: flex-start;
      padding: 0.5rem 0.75rem;
      border-radius: var(--pg-radius-sm);
    }

    .rg[data-touched][data-invalid] {
      outline: 2px solid #ef4444;
      outline-offset: 2px;
    }

    .rg-option {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--pg-text);
      cursor: pointer;
    }

    .rg-dot {
      flex: none;
      position: relative;
      width: 20px;
      height: 20px;
      border: 2px solid var(--pg-border-strong);
      border-radius: 50%;
      background: var(--pg-surface);
      transition: border-color 0.15s ease;
    }

    .rg-option[data-state='checked'] .rg-dot {
      border-color: var(--pg-primary);
    }

    .rg-option[data-state='checked'] .rg-dot::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      background: var(--pg-primary);
    }

    .rg-error {
      margin: 0;
      font-size: 0.85rem;
      color: #ef4444;
    }
  `,
})
export class RadioGroupFormFieldExample {
  protected readonly options: readonly { value: string; label: string }[] = [
    { value: 'standard', label: 'Standard (3–5 days)' },
    { value: 'express', label: 'Express (next day)' },
    { value: 'pickup', label: 'Store pickup' },
  ];

  protected readonly model = signal<Checkout>({ shipping: '' });
  protected readonly checkoutForm = form(this.model, (path) => {
    validate(path.shipping, (ctx) =>
      ctx.value() === '' ? requiredError({ message: 'Choose a shipping method' }) : undefined,
    );
  });

  protected errorKinds(): string {
    return this.checkoutForm
      .shipping()
      .errors()
      .map((error) => error.kind)
      .join(', ');
  }
}
