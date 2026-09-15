import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTextarea } from 'forty-cdk/input';

@Component({
  selector: 'app-input-autosize-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTextarea],
  template: `
    <div class="stack">
      <textarea
        forTextarea
        class="input area"
        autosize
        rows="2"
        aria-label="Release notes"
        placeholder="Type a few lines…"
        [(value)]="text"
      ></textarea>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stack {
      width: min(360px, 100%);
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

    .area {
      min-height: 3.5rem;
    }

    .area[data-autosize] {
      resize: none;
      overflow: hidden;
    }
  `,
})
export class InputAutosizeExample {
  protected readonly text = signal(
    'forty-cdk 0.1.0\n— Breadcrumbs, Search, Pagination\n— File Upload, Button',
  );
}
