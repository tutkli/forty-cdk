import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForNumberInput } from 'forty-cdk/number-input';

@Component({
  selector: 'app-number-input-formatting-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForNumberInput],
  template: `
    <div class="stack">
      <input
        forNumberInput
        class="input num"
        aria-label="Price"
        [(value)]="amount"
        locale="en-US"
        [formatOptions]="{ style: 'currency', currency: 'USD' }"
      />
      <p class="hint">value() is {{ amount() ?? 'null' }}. Use ↑ / ↓ to step.</p>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stack {
      width: min(320px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .input {
      width: 100%;
      font: inherit;
      padding: 0.5rem 0.7rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
    }

    .num {
      font-size: 1.05rem;
      font-variant-numeric: tabular-nums;
    }

    .hint {
      margin: 0;
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class NumberInputFormattingExample {
  protected readonly amount = signal<number | null>(1234.5);
}
