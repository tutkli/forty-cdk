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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .toggle:hover {
      background: var(--pg-surface-2);
    }

    .toggle[data-state='checked'],
    .toggle[data-state='checked']:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
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
