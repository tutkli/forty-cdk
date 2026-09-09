import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForField, ForLabel } from 'forty-cdk/field';
import { ForFieldset, ForFieldsetLegend } from 'forty-cdk/fieldset';
import { ForInput } from 'forty-cdk/input';

@Component({
  selector: 'app-fieldset-role-group-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFieldset, ForFieldsetLegend, ForField, ForLabel, ForInput],
  template: `
    <div forFieldset class="group">
      <span forFieldsetLegend class="legend">Billing contact</span>

      <div forField class="field">
        <label forLabel class="lbl">
          <span class="lbl-text">Full name</span>
          <input forInput class="input" placeholder="Ada Lovelace" />
        </label>
      </div>
      <div forField class="field">
        <label forLabel class="lbl">
          <span class="lbl-text">Email</span>
          <input forInput class="input" type="email" placeholder="ada@example.com" />
        </label>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .group {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1.1rem 1.2rem 1.3rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .legend {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--pg-text);
    }

    .lbl {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .lbl-text {
      font-size: 0.85rem;
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
  `,
})
export class FieldsetRoleGroupExample {}
