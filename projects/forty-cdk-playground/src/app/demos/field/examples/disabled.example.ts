import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForField, ForFieldControl, ForFieldDescription, ForLabel } from 'forty-cdk/field';

@Component({
  selector: 'app-field-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForField, ForLabel, ForFieldControl, ForFieldDescription],
  template: `
    <div forField class="field">
      <label forLabel class="field-label">
        <span class="field-label-text">Email address</span>
        <input forFieldControl class="input" type="email" placeholder="jane@example.com" disabled />
      </label>
      <p forFieldDescription class="field-desc">Editing is locked while your plan is suspended.</p>
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

    .field-desc {
      margin: 0;
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class FieldDisabledExample {}
