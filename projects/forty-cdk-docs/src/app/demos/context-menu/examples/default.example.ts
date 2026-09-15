import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import { ForMenuContent, ForMenuItem, ForMenuSeparator } from 'forty-cdk/menu';

@Component({
  selector: 'app-context-menu-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem, ForMenuSeparator],
  template: `
    <div forContextMenu #menu="forContextMenu">
      <div forContextMenuTrigger tabindex="0" class="context-menu-region">
        Right-click anywhere in this area
        <span class="context-menu-hint">(or focus it and press Shift+F10)</span>
      </div>
      @if (menu.open()) {
        <div forMenuContent class="context-menu" animate.enter="context-menu-pop-in">
          <button forMenuItem class="context-menu-item">Cut</button>
          <button forMenuItem class="context-menu-item">Copy</button>
          <button forMenuItem class="context-menu-item">Paste</button>
          <hr forMenuSeparator class="context-menu-separator" />
          <button forMenuItem class="context-menu-item">Rename</button>
          <button forMenuItem class="context-menu-item context-menu-item--danger">Delete</button>
        </div>
      }
    </div>
  `,
  styles: `
    app-context-menu-default-example {
      display: contents;
    }

    .context-menu-region {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      width: min(420px, 100%);
      min-height: 180px;
      padding: 1.5rem;
      text-align: center;
      font-weight: 600;
      color: var(--ex-muted, #585d66);
      background: var(--ex-surface-2, #f2eee6);
      border: 2px dashed var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      user-select: none;
    }

    .context-menu-hint {
      font-size: 0.8rem;
      font-weight: 400;
    }

    .context-menu {
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

    .context-menu-item {
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

    .context-menu-item[data-highlighted],
    .context-menu-item[data-state='open'],
    .context-menu-item:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .context-menu-item[data-disabled] {
      color: var(--ex-muted, #585d66);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .context-menu-item--danger {
      color: var(--ex-danger, #b3261e);
    }

    .context-menu-item--danger[data-highlighted],
    .context-menu-item--danger:not([data-disabled]):hover {
      background: color-mix(in srgb, var(--ex-danger, #b3261e) 14%, transparent);
    }

    .context-menu-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--ex-border, #e5e0d6);
    }

    .context-menu-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: context-menu-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
    }

    @keyframes context-menu-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .context-menu-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ContextMenuDefaultExample {}
