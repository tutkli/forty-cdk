import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForInput, ForTextarea } from 'forty-cdk/input';

@Component({
  selector: 'app-input-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForInput, ForTextarea],
  template: `
    <div class="stack">
      <input
        forInput
        class="input"
        type="email"
        aria-label="Email address"
        placeholder="jane@example.com"
        [(value)]="email"
      />
      <textarea
        forTextarea
        class="input area"
        rows="3"
        aria-label="Short bio"
        placeholder="A short bio…"
        [(value)]="bio"
      ></textarea>
      <p class="state">{{ email() || '∅' }} — {{ bio().length }} chars</p>
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
      gap: 0.75rem;
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

    .area {
      resize: vertical;
      min-height: 4.5rem;
    }

    .input[data-empty]::placeholder {
      opacity: 0.6;
    }

    .state {
      margin: 0;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class InputDefaultExample {
  protected readonly email = signal('');
  protected readonly bio = signal('');
}
