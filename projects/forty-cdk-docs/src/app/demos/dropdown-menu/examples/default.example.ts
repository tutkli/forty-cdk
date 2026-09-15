import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenuContent, ForMenuItem, ForMenuSeparator } from 'forty-cdk/menu';

@Component({
  selector: 'app-dropdown-menu-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem, ForMenuSeparator],
  template: `
    <div forDropdownMenu #menu="forDropdownMenu" side="bottom" align="start" [sideOffset]="4">
      <button forDropdownMenuTrigger class="dropdown-menu-trigger">Actions</button>
      @if (menu.open()) {
        <div forMenuContent class="dropdown-menu" animate.enter="dropdown-menu-pop-in">
          <button forMenuItem class="dropdown-menu-item">New tab</button>
          <button forMenuItem class="dropdown-menu-item">New window</button>
          <hr forMenuSeparator class="dropdown-menu-separator" />
          <button forMenuItem class="dropdown-menu-item">Downloads</button>
          <button forMenuItem class="dropdown-menu-item">Bookmarks</button>
          <button forMenuItem class="dropdown-menu-item" disabled>Sync (signed out)</button>
          <hr forMenuSeparator class="dropdown-menu-separator" />
          <button forMenuItem class="dropdown-menu-item dropdown-menu-item--danger">
            Clear browsing data
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    app-dropdown-menu-default-example {
      display: contents;
    }

    .dropdown-menu-trigger {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-accent, #0e7c6b);
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
      cursor: pointer;
    }

    .dropdown-menu-trigger:hover {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }

    .dropdown-menu {
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

    .dropdown-menu-item {
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

    .dropdown-menu-item[data-highlighted],
    .dropdown-menu-item[data-state='open'],
    .dropdown-menu-item:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .dropdown-menu-item[data-disabled] {
      color: var(--ex-muted, #585d66);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .dropdown-menu-item--danger {
      color: var(--ex-danger, #b3261e);
    }

    .dropdown-menu-item--danger[data-highlighted],
    .dropdown-menu-item--danger:not([data-disabled]):hover {
      background: color-mix(in srgb, var(--ex-danger, #b3261e) 14%, transparent);
    }

    .dropdown-menu-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--ex-border, #e5e0d6);
    }

    .dropdown-menu-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: dropdown-menu-pop-in 0.2s var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))
        both;
    }

    @keyframes dropdown-menu-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dropdown-menu-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DropdownMenuDefaultExample {}
