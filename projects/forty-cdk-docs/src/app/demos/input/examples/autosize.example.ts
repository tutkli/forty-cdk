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
        #notes="forTextarea"
        class="input area"
        autosize
        rows="2"
        aria-label="Release notes"
        placeholder="Type a few lines…"
        [attr.data-capped]="expanded() ? null : ''"
        [(value)]="text"
      ></textarea>
      @if (notes.overflowing() || expanded()) {
        <button
          type="button"
          class="more"
          [attr.aria-expanded]="expanded()"
          (click)="expanded.set(!expanded())"
        >
          {{ expanded() ? 'Show less' : 'Read more' }}
        </button>
      }
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

    .area[data-capped] {
      max-height: 6.5rem;
    }

    .more {
      margin-top: 0.4rem;
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      font-size: 0.85rem;
      color: var(--ex-accent, #0e7c6b);
      cursor: pointer;
    }
  `,
})
export class InputAutosizeExample {
  protected readonly text = signal(
    [
      'forty-cdk 0.1.0',
      '— Breadcrumbs, Search, Pagination',
      '— File Upload, Button',
      '— Slider, Switch, Toggle',
      '— Tabs, Accordion, Disclosure',
      '— Dialog, Drawer, Popover',
    ].join('\n'),
  );
  protected readonly expanded = signal(false);
}
