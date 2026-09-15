import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForToggle } from 'forty-cdk/toggle';

@Component({
  selector: 'app-toggle-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForToggle],
  template: ` <button forToggle class="toggle" [(checked)]="bold">Bold</button> `,
  styles: `
    :host {
      display: contents;
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

    @media (prefers-reduced-motion: reduce) {
      .toggle {
        transition: none;
      }
    }
  `,
})
export class ToggleDefaultExample {
  protected readonly bold = signal(false);
}
