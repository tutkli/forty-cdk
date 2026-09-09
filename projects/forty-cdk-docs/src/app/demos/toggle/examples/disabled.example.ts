import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForToggle } from 'forty-cdk/toggle';

@Component({
  selector: 'app-toggle-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForToggle],
  template: ` <button forToggle class="toggle" [(checked)]="bold" disabled>Bold</button> `,
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
    }

    .toggle[data-state='checked'] {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .toggle[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class ToggleDisabledExample {
  protected readonly bold = signal(false);
}
