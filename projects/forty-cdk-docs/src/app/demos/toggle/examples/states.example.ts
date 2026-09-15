import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForToggle } from 'forty-cdk/toggle';

@Component({
  selector: 'app-toggle-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForToggle],
  template: `
    <div class="states">
      <div class="state">
        <span class="state-label">Default</span>
        <button forToggle class="toggle" [(checked)]="bold">Bold</button>
      </div>

      <div class="state">
        <span class="state-label">Disabled</span>
        <button forToggle class="toggle" [(checked)]="bold" disabled>Bold</button>
      </div>

      <div class="state">
        <span class="state-label">Read-only</span>
        <button forToggle class="toggle" [(checked)]="bold" readonly>Bold</button>
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
      gap: 1.8rem;
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
      color: var(--ex-muted, #585d66);
    }

    .toggle {
      font: inherit;
      font-weight: 600;
      padding: 0.45rem 0.85rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .toggle:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .toggle[data-state='checked'],
    .toggle[data-state='checked']:hover {
      background: var(--ex-accent, #0e7c6b);
      border-color: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .toggle[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toggle[data-readonly] {
      cursor: default;
      border-style: dashed;
    }

    @media (prefers-reduced-motion: reduce) {
      .toggle {
        transition: none;
      }
    }
  `,
})
export class ToggleStatesExample {
  protected readonly bold = signal(true);
}
