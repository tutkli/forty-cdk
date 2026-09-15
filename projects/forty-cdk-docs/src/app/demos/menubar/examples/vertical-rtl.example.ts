import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { ForMenuContent, ForMenuItem, ForMenuSeparator } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';

@Component({
  selector: 'app-menubar-vertical-rtl-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem, ForMenuSeparator],
  template: `
    <div
      forMenubar
      orientation="vertical"
      dir="rtl"
      [(value)]="openMenu"
      ariaLabel="Workspace"
      class="menubar-vertical menubar-vertical--side"
    >
      <button forMenubarTrigger value="workspace" class="menubar-vertical-trigger">
        Workspace
      </button>
      @if (openMenu() === 'workspace') {
        <div
          forMenuContent
          class="menubar-vertical-content"
          animate.enter="menubar-vertical-pop-in"
        >
          <button forMenuItem class="menubar-vertical-item">New project</button>
          <button forMenuItem class="menubar-vertical-item">Import…</button>
          <hr forMenuSeparator class="menubar-vertical-separator" />
          <button forMenuItem class="menubar-vertical-item">Settings</button>
        </div>
      }

      <button forMenubarTrigger value="insert" class="menubar-vertical-trigger">Insert</button>
      @if (openMenu() === 'insert') {
        <div
          forMenuContent
          class="menubar-vertical-content"
          animate.enter="menubar-vertical-pop-in"
        >
          <button forMenuItem class="menubar-vertical-item">Image</button>
          <button forMenuItem class="menubar-vertical-item">Table</button>
          <button forMenuItem class="menubar-vertical-item">Code block</button>
        </div>
      }

      <button forMenubarTrigger value="format" class="menubar-vertical-trigger">Format</button>
      @if (openMenu() === 'format') {
        <div
          forMenuContent
          class="menubar-vertical-content"
          animate.enter="menubar-vertical-pop-in"
        >
          <button forMenuItem class="menubar-vertical-item">Bold</button>
          <button forMenuItem class="menubar-vertical-item">Italic</button>
          <button forMenuItem class="menubar-vertical-item">Clear formatting</button>
        </div>
      }
    </div>
  `,
  styles: `
    app-menubar-vertical-rtl-example {
      display: contents;
    }

    .menubar-vertical {
      display: inline-flex;
      gap: 2px;
      padding: 4px;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
    }

    .menubar-vertical[data-orientation='vertical'] {
      flex-direction: column;
      align-items: stretch;
    }

    .menubar-vertical[data-disabled] {
      opacity: 0.6;
    }

    .menubar-vertical--side {
      min-width: 160px;
    }

    .menubar-vertical-trigger {
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      text-align: left;
      padding: 0.4rem 0.75rem;
      border: 0;
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .menubar-vertical-trigger:hover,
    .menubar-vertical-trigger[data-state='open'] {
      background: var(--ex-surface-2, #f2eee6);
    }

    .menubar-vertical-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 200px;
      padding: 5px;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      box-shadow: var(
        --ex-shadow,
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 20px 40px -18px rgba(0, 0, 0, 0.2)
      );
    }

    .menubar-vertical-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      padding: 0.45rem 0.6rem;
      border: 0;
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .menubar-vertical-item[data-highlighted],
    .menubar-vertical-item[data-state='open'],
    .menubar-vertical-item:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .menubar-vertical-item[data-disabled] {
      color: var(--ex-muted, #585d66);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .menubar-vertical-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--ex-border, #e5e0d6);
    }

    .menubar-vertical-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: menubar-vertical-pop-in 0.2s
        var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
    }

    @keyframes menubar-vertical-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .menubar-vertical-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class MenubarVerticalRtlExample {
  protected readonly openMenu = signal<string | null>(null);
}
