import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForToggle, ForToggleGroup, ForToggleGroupItem } from 'forty-cdk';

import { DemoLayout } from '../ui/demo-layout';

@Component({
  selector: 'app-toggle-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForToggle, ForToggleGroup, ForToggleGroupItem],
  template: `
    <playground-demo
      title="Toggle / ToggleGroup"
      summary="A standalone two-state button (aria-pressed), and a group of toggles with roving tabindex and arrow-key navigation. In a group, arrows only move focus — selection needs Space/Enter or click."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/button/"
    >
      <div demo class="tg-demo">
        <div class="tg-block">
          <span class="tg-caption">Standalone</span>
          <button forToggle class="tg-btn" [(pressed)]="bold" [disabled]="disabled()">Bold</button>
        </div>

        <div class="tg-block">
          <span class="tg-caption">Group (multiple)</span>
          <div forToggleGroup class="tg-group" [(value)]="format" multiple aria-label="Text format">
            <button forToggleGroupItem class="tg-btn tg-icon" value="bold" aria-label="Bold">B</button>
            <button forToggleGroupItem class="tg-btn tg-icon" value="italic" aria-label="Italic">I</button>
            <button forToggleGroupItem class="tg-btn tg-icon" value="underline" aria-label="Underline">U</button>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <label class="pg-check">
          <input type="checkbox" [checked]="disabled()" (change)="disabled.set(isChecked($event))" />
          disabled (standalone)
        </label>

        <p class="pg-state">
          pressed: <b>{{ bold() }}</b
          ><br />
          format: <b>{{ format().length ? format().join(', ') : 'none' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tg-demo {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .tg-block {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .tg-caption {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    .tg-group {
      display: inline-flex;
      gap: 0.3rem;
    }

    .tg-btn {
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

    .tg-icon {
      width: 40px;
      padding: 0.45rem 0;
      text-align: center;
    }

    .tg-btn:hover {
      background: var(--pg-surface-2);
    }

    .tg-btn[data-state='checked'],
    .tg-btn[data-state='checked']:hover {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .tg-btn[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class ToggleDemo {
  protected readonly bold = signal(false);
  protected readonly format = signal<readonly string[]>([]);
  protected readonly disabled = signal(false);

  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
