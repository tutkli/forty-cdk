import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk/checkbox';

@Component({
  selector: 'app-checkbox-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCheckbox],
  template: `
    <div class="states">
      <div class="state">
        <span class="state-label">Default</span>
        <button forCheckbox class="cb-row" [(checked)]="checked">
          <span class="cb">
            <span class="cb-check" aria-hidden="true"></span>
          </span>
          I agree to the terms
        </button>
      </div>

      <div class="state">
        <span class="state-label">Disabled</span>
        <button forCheckbox class="cb-row" [(checked)]="checked" disabled>
          <span class="cb">
            <span class="cb-check" aria-hidden="true"></span>
          </span>
          I agree to the terms
        </button>
      </div>

      <div class="state">
        <span class="state-label">Read-only</span>
        <button forCheckbox class="cb-row" [(checked)]="checked" readonly>
          <span class="cb">
            <span class="cb-check" aria-hidden="true"></span>
          </span>
          I agree to the terms
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .states {
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }

    .state {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .state-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--pg-text-muted);
    }

    .cb-row {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--pg-text);
      cursor: pointer;
    }

    .cb-row[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .cb-row[data-readonly] {
      cursor: default;
    }

    .cb {
      flex: none;
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border: 2px solid var(--pg-border-strong);
      border-radius: 6px;
      background: var(--pg-surface);
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .cb-row[data-state='checked'] .cb {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
    }

    .cb-row[data-readonly] .cb {
      border-style: dashed;
    }

    .cb-check {
      display: none;
      width: 12px;
      height: 12px;
      border: solid var(--pg-primary-contrast);
      border-width: 0 2.5px 2.5px 0;
      transform: rotate(45deg) translate(-1px, -1px);
    }

    .cb-row[data-state='checked'] .cb-check {
      display: block;
    }

    @media (prefers-reduced-motion: reduce) {
      .cb {
        transition: none;
      }
    }
  `,
})
export class CheckboxStatesExample {
  protected readonly checked = signal(true);
}
