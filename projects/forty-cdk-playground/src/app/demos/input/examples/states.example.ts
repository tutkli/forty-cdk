import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForInput } from 'forty-cdk/input';

@Component({
  selector: 'app-input-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForInput],
  template: `
    <div class="stack">
      <label class="row">
        <span class="row-label">Disabled</span>
        <input
          forInput
          class="input"
          type="text"
          disabled
          aria-label="Disabled field"
          [(value)]="locked"
        />
      </label>
      <label class="row">
        <span class="row-label">Read-only</span>
        <input
          forInput
          class="input"
          type="text"
          readonly
          aria-label="Read-only field"
          [(value)]="reference"
        />
      </label>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stack {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .row {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .row-label {
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

    .input[data-disabled] {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .input[data-readonly] {
      background: var(--pg-surface-2);
    }
  `,
})
export class InputStatesExample {
  protected readonly locked = signal('Cannot edit me');
  protected readonly reference = signal('Read me, do not change me');
}
