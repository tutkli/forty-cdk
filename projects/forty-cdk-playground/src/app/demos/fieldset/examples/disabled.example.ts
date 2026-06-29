import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForField, ForLabel } from 'forty-cdk/field';
import { ForFieldset, ForFieldsetLegend } from 'forty-cdk/fieldset';
import { ForInput } from 'forty-cdk/input';

@Component({
  selector: 'app-fieldset-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFieldset, ForFieldsetLegend, ForField, ForLabel, ForInput],
  template: `
    <fieldset forFieldset class="set" disabled>
      <legend forFieldsetLegend class="legend">Shipping address</legend>

      <div forField class="field">
        <label forLabel class="lbl">
          <span class="lbl-text">Street</span>
          <input forInput class="input" placeholder="221B Baker Street" />
        </label>
      </div>
      <div forField class="field">
        <label forLabel class="lbl">
          <span class="lbl-text">City</span>
          <input forInput class="input" placeholder="London" />
        </label>
      </div>
    </fieldset>
  `,
  styles: `
    :host {
      display: contents;
    }

    .set {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      margin: 0;
      padding: 1.1rem 1.2rem 1.3rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      transition: opacity 0.15s ease;
    }

    .set[data-disabled] {
      opacity: 0.55;
    }

    .legend {
      padding: 0 0.4rem;
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

    @media (prefers-reduced-motion: reduce) {
      .set {
        transition: none;
      }
    }
  `,
})
export class FieldsetDisabledExample {}
