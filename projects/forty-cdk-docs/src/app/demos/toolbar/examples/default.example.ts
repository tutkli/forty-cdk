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
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
    }

    .toolbar[data-orientation='vertical'] {
      flex-direction: column;
      align-items: stretch;
    }

    .toolbar-grp {
      display: inline-flex;
      gap: 0.15rem;
    }

    .toolbar[data-orientation='vertical'] .toolbar-grp {
      flex-direction: column;
    }

    .toolbar-btn {
      font: inherit;
      font-weight: 600;
      padding: 0.4rem 0.7rem;
      color: var(--pg-text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
    }

    .toolbar-icon {
      width: 36px;
      padding: 0.4rem 0;
      text-align: center;
    }

    .toolbar-btn:hover {
      background: var(--pg-surface-2);
    }

    .toolbar-btn[data-state='checked'] {
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
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
      background: var(--pg-border-strong);
    }

    .toolbar[data-orientation='vertical'] .toolbar-sep {
      width: auto;
      height: 1px;
      margin: 0.2rem 0;
    }

    .toolbar-link {
      display: inline-flex;
      align-items: center;
      padding: 0.4rem 0.7rem;
      font-weight: 600;
      color: var(--pg-primary);
      text-decoration: none;
      border-radius: var(--pg-radius-sm);
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
      outline: 2px solid var(--pg-primary);
      outline-offset: 2px;
    }
  `,
})
export class ToolbarDefaultExample {
  protected readonly style = signal<readonly string[]>(['bold']);
  protected readonly align = signal<readonly string[]>(['left']);
}
