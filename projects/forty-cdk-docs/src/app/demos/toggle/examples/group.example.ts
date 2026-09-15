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
export class ToggleGroupExample {
  protected readonly format = signal<readonly string[]>(['bold']);
}
