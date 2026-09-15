import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';
import {
  ForToolbar,
  ForToolbarButton,
  ForToolbarLink,
  ForToolbarSeparator,
} from 'forty-cdk/toolbar';

@Component({
  selector: 'app-toolbar-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForToolbar,
    ForToolbarButton,
    ForToolbarLink,
    ForToolbarSeparator,
    ForToggleGroup,
    ForToggleGroupItem,
  ],
  template: `
    <div forToolbar class="toolbar" aria-label="Text formatting">
      <button forToolbarButton class="toolbar-btn">Undo</button>
      <button forToolbarButton class="toolbar-btn">Redo</button>

      <span forToolbarSeparator class="toolbar-sep"></span>

      <div forToggleGroup class="toolbar-grp" multiple [(value)]="style" aria-label="Text style">
        <button forToggleGroupItem class="toolbar-btn toolbar-icon" value="bold" aria-label="Bold">
          B
        </button>
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="italic"
          aria-label="Italic"
        >
          I
        </button>
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="underline"
          aria-label="Underline"
        >
          U
        </button>
      </div>

      <span forToolbarSeparator class="toolbar-sep"></span>

      <div forToggleGroup class="toolbar-grp" [(value)]="align" aria-label="Alignment">
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="left"
          aria-label="Align left"
        >
          L
        </button>
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="center"
          aria-label="Align center"
        >
          C
        </button>
        <button
          forToggleGroupItem
          class="toolbar-btn toolbar-icon"
          value="right"
          aria-label="Align right"
        >
          R
        </button>
      </div>

      <span forToolbarSeparator class="toolbar-sep"></span>

      <a
        forToolbarLink
        class="toolbar-link"
        href="https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/"
        target="_blank"
        rel="noreferrer noopener"
      >
        Docs
      </a>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .toolbar {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.35rem;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
    }

    .toolbar-grp {
      display: inline-flex;
      gap: 0.15rem;
    }

    .toolbar-btn {
      font: inherit;
      font-weight: 600;
      padding: 0.4rem 0.7rem;
      color: var(--ex-text, #17191c);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--ex-radius-sm, 14px);
      cursor: pointer;
    }

    .toolbar-icon {
      width: 36px;
      padding: 0.4rem 0;
      text-align: center;
    }

    .toolbar-btn:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .toolbar-btn[data-state='checked'] {
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
    }

    .toolbar-btn:disabled,
    .toolbar-btn[data-disabled] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .toolbar-sep {
      align-self: stretch;
      width: 1px;
      margin: 0 0.2rem;
      background: var(--ex-border-strong, #d0c9bc);
    }

    .toolbar-link {
      display: inline-flex;
      align-items: center;
      padding: 0.4rem 0.7rem;
      font-weight: 600;
      color: var(--ex-accent, #0e7c6b);
      text-decoration: none;
      border-radius: var(--ex-radius-sm, 14px);
    }

    .toolbar-link:hover {
      text-decoration: underline;
    }

    .toolbar-link[aria-disabled='true'] {
      opacity: 0.45;
      pointer-events: none;
    }

    .toolbar-btn:focus-visible,
    .toolbar-link:focus-visible {
      outline: 2px solid var(--ex-accent, #0e7c6b);
      outline-offset: 2px;
    }
  `,
})
export class ToolbarDefaultExample {
  protected readonly style = signal<readonly string[]>(['bold']);
  protected readonly align = signal<readonly string[]>(['left']);
}
