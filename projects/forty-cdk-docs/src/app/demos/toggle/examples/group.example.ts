import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';

@Component({
  selector: 'app-toggle-group-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForToggleGroup, ForToggleGroupItem],
  template: `
    <div forToggleGroup class="group" [(value)]="format" multiple aria-label="Text format">
      <button forToggleGroupItem class="toggle" value="bold" aria-label="Bold">B</button>
      <button forToggleGroupItem class="toggle" value="italic" aria-label="Italic">I</button>
      <button forToggleGroupItem class="toggle" value="underline" aria-label="Underline">U</button>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .group {
      display: inline-flex;
      gap: 0.3rem;
    }

    .toggle {
      width: 40px;
      font: inherit;
      font-weight: 600;
      padding: 0.45rem 0;
      text-align: center;
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
export class ToggleGroupExample {
  protected readonly format = signal<readonly string[]>(['bold']);
}
