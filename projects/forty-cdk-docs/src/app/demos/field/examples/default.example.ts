import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForField, ForFieldControl, ForFieldDescription, ForLabel } from 'forty-cdk/field';

@Component({
  selector: 'app-field-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForField, ForLabel, ForFieldControl, ForFieldDescription],
  template: `
    <div forField class="field">
      <label forLabel class="field-label">
        <span class="field-label-text">Email address</span>
        <input
          forFieldControl
          class="input"
          type="email"
          placeholder="jane@example.com"
          required
          aria-required="true"
        />
      </label>
      <p forFieldDescription class="field-desc">We'll only use this to send receipts.</p>
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
      gap: 0.45rem;
    }

    .field-label {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ex-text, #17191c);
    }

    .field[data-required] .field-label-text::after {
      content: ' *';
      color: #ef4444;
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

    .field[data-invalid] .input {
      border-color: #ef4444;
    }

    .field-desc {
      margin: 0;
      font-size: 0.82rem;
      color: var(--ex-muted, #585d66);
    }
  `,
})
export class FieldDefaultExample {}
