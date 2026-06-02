import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForField, ForFieldControl, ForFieldDescription, ForLabel } from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-field-anatomy-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ControlSwitch, ForField, ForLabel, ForFieldControl, ForFieldDescription],
  template: `
    <playground-demo
      title="Anatomy"
      subtitle="forField renders nothing — it only ties the label, description and control together. forLabel adopts the field's generated id and the control gains aria-labelledby / aria-describedby / its own id, so clicking the label focuses the input. The field host reflects data-invalid / data-required / data-disabled from the control for styling. This input is a plain native element opted in with forFieldControl."
      sourcePath="projects/forty-cdk-playground/src/app/demos/field/examples/anatomy.example.ts"
    >
      <div demo>
        <div forField #field="forField" class="field">
          <label forLabel class="field-label">
            <span class="field-label-text">Email address</span>
            <input
              forFieldControl
              class="pg-input"
              type="email"
              placeholder="jane@example.com"
              [required]="required()"
              [invalid]="invalid()"
              [disabled]="disabled()"
              [attr.aria-required]="required() ? 'true' : null"
              [attr.disabled]="disabled() ? '' : null"
            />
          </label>
          <p forFieldDescription class="field-desc">We'll only use this to send receipts.</p>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="Required" [(checked)]="required" />
        <app-control-switch label="Invalid" [(checked)]="invalid" />
        <app-control-switch label="Disabled" [(checked)]="disabled" />
        <p class="pg-state">
          control id: <b>{{ field.controlId() }}</b
          ><br />
          aria-labelledby: <b>{{ field.labelledBy() }}</b
          ><br />
          aria-describedby: <b>{{ field.describedBy() }}</b
          ><br />
          data-invalid: <b>{{ field.invalid() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .field {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .field-label {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--pg-text);
    }

    .field[data-required] .field-label-text::after {
      content: ' *';
      color: #ef4444;
    }

    .field[data-invalid] .pg-input {
      border-color: #ef4444;
    }

    .field[data-disabled] {
      opacity: 0.55;
    }

    .field-desc {
      margin: 0;
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class FieldAnatomyExample {
  protected readonly required = signal(true);
  protected readonly invalid = signal(false);
  protected readonly disabled = signal(false);
}
