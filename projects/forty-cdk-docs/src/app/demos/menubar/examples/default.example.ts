import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { ForMenuContent, ForMenuItem, ForMenuSeparator } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';

@Component({
  selector: 'app-menubar-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem, ForMenuSeparator],
  template: `
    <div forMenubar [(value)]="openMenu" ariaLabel="Application" class="menubar-menu">
      <button forMenubarTrigger value="file" class="menubar-menu-trigger">File</button>
      @if (openMenu() === 'file') {
        <div forMenuContent class="menubar-menu-content" animate.enter="menubar-menu-pop-in">
          <button forMenuItem class="menubar-menu-item">New file</button>
          <button forMenuItem class="menubar-menu-item">Open…</button>
          <button forMenuItem class="menubar-menu-item">Save</button>
          <hr forMenuSeparator class="menubar-menu-separator" />
          <button forMenuItem class="menubar-menu-item">Quit</button>
        </div>
      }

      <button forMenubarTrigger value="edit" class="menubar-menu-trigger">Edit</button>
      @if (openMenu() === 'edit') {
        <div forMenuContent class="menubar-menu-content" animate.enter="menubar-menu-pop-in">
          <button forMenuItem class="menubar-menu-item">Undo</button>
          <button forMenuItem class="menubar-menu-item" disabled>Redo</button>
          <hr forMenuSeparator class="menubar-menu-separator" />
          <button forMenuItem class="menubar-menu-item">Cut</button>
          <button forMenuItem class="menubar-menu-item">Copy</button>
          <button forMenuItem class="menubar-menu-item">Paste</button>
        </div>
      }

      <button forMenubarTrigger value="view" class="menubar-menu-trigger">View</button>
      @if (openMenu() === 'view') {
        <div forMenuContent class="menubar-menu-content" animate.enter="menubar-menu-pop-in">
          <button forMenuItem class="menubar-menu-item">Zoom in</button>
          <button forMenuItem class="menubar-menu-item">Zoom out</button>
          <button forMenuItem class="menubar-menu-item">Reset zoom</button>
        </div>
      }
    </div>
  `,
  styles: `
    app-menubar-default-example {
      display: contents;
    }

    .menubar-menu {
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

    .menubar-menu[data-disabled] {
      opacity: 0.6;
    }

    .menubar-menu-trigger {
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

    .menubar-menu-trigger:hover,
    .menubar-menu-trigger[data-state='open'] {
      background: var(--ex-surface-2, #f2eee6);
    }

    .menubar-menu-content {
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

    .menubar-menu-item {
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

    .menubar-menu-item[data-highlighted],
    .menubar-menu-item[data-state='open'],
    .menubar-menu-item:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .menubar-menu-item[data-disabled] {
      color: var(--ex-muted, #585d66);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .menubar-menu-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--ex-border, #e5e0d6);
    }

    .menubar-menu-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: menubar-menu-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
    }

    @keyframes menubar-menu-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .menubar-menu-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class MenubarDefaultExample {
  protected readonly openMenu = signal<string | null>(null);
}
