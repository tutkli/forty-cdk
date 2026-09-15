import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForField, ForFieldControl, ForFieldDescription, ForLabel } from 'forty-cdk/field';

@Component({
  selector: 'app-field-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForField, ForLabel, ForFieldControl, ForFieldDescription],
  template: `
    <div class="states">
      <div class="state">
        <span class="state-label">Default</span>
        <div forField class="field">
          <label forLabel class="field-label">
            <span class="field-label-text">Email address</span>
            <input forFieldControl class="input" type="email" placeholder="jane@example.com" />
          </label>
          <p forFieldDescription class="field-desc">We'll only use this to send receipts.</p>
        </div>
      </div>

      <div class="state">
        <span class="state-label">Required</span>
        <div forField class="field">
          <label forLabel class="field-label">
            <span class="field-label-text">Email address</span>
            <input
              forFieldControl
              class="input"
              type="email"
              placeholder="jane@example.com"
              required
            />
          </label>
          <p forFieldDescription class="field-desc">The asterisk is a rule, not a second input.</p>
        </div>
      </div>

      <div class="state">
        <span class="state-label">Invalid</span>
        <div forField class="field">
          <label forLabel class="field-label">
            <span class="field-label-text">Email address</span>
            <input forFieldControl class="input" type="email" value="jane@example" invalid />
          </label>
          <p forFieldDescription class="field-desc">That address is missing its domain.</p>
        </div>
      </div>

      <div class="state">
        <span class="state-label">Disabled</span>
        <div forField class="field">
          <label forLabel class="field-label">
            <span class="field-label-text">Email address</span>
            <input
              forFieldControl
              class="input"
              type="email"
              placeholder="jane@example.com"
              disabled
            />
          </label>
          <p forFieldDescription class="field-desc">
            Editing is locked while your plan is suspended.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .states {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 1.6rem;
    }

    .state {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .state-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--pg-text-muted);
    }

    .field {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .field[data-disabled] {
      opacity: 0.55;
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

    .input {
      width: 100%;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.5rem 0.7rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
    }

    .field[data-invalid] .input {
      border-color: #ef4444;
    }

    .field-desc {
      margin: 0;
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }

    .field[data-invalid] .field-desc {
      color: #ef4444;
    }
  `,
})
export class FieldStatesExample {}
