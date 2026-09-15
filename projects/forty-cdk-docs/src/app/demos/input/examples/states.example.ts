import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForInput } from 'forty-cdk/input';

@Component({
  selector: 'app-input-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForInput],
  template: `
    <div class="stack">
      <label class="row">
        <span class="row-label">Default</span>
        <input forInput class="input" type="text" aria-label="Editable field" [(value)]="draft" />
      </label>
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
      color: var(--ex-text, #17191c);
    }

    .input {
      width: 100%;
      font: inherit;
      font-size: 0.9rem;
      padding: 0.5rem 0.7rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-border-strong, #d0c9bc);
      background: var(--ex-surface, #ffffff);
      color: var(--ex-text, #17191c);
    }

    .input[data-disabled] {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .input[data-readonly] {
      background: var(--ex-surface-2, #f2eee6);
    }
  `,
})
export class InputStatesExample {
  protected readonly draft = signal('Type over me');
  protected readonly locked = signal('Cannot edit me');
  protected readonly reference = signal('Read me, do not change me');
}
