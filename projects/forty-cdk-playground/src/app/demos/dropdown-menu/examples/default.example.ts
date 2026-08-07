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
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-primary);
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      cursor: pointer;
    }

    .dropdown-menu-trigger:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .dropdown-menu {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 200px;
      padding: 5px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
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
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text);
      cursor: pointer;
    }

    .dropdown-menu-item[data-highlighted],
    .dropdown-menu-item[data-state='open'],
    .dropdown-menu-item:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .dropdown-menu-item[data-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .dropdown-menu-item--danger {
      color: var(--pg-danger);
    }

    .dropdown-menu-item--danger[data-highlighted],
    .dropdown-menu-item--danger:not([data-disabled]):hover {
      background: color-mix(in srgb, var(--pg-danger) 14%, transparent);
    }

    .dropdown-menu-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--pg-border);
    }

    .dropdown-menu-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: dropdown-menu-pop-in 0.2s var(--pg-ease-spring) both;
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
