import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForMenuCheckboxItem,
  ForMenuContent,
  ForMenuGroup,
  ForMenuGroupLabel,
  ForMenuItem,
  ForMenuItemIndicator,
  ForMenuRadioGroup,
  ForMenuRadioItem,
  ForMenuSeparator,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk/menu';

@Component({
  selector: 'app-menu-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuCheckboxItem,
    ForMenuRadioGroup,
    ForMenuRadioItem,
    ForMenuItemIndicator,
    ForMenuSeparator,
    ForMenuGroup,
    ForMenuGroupLabel,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  template: `
    <div forDropdownMenu #menu="forDropdownMenu">
      <button forDropdownMenuTrigger class="menu-trigger">View options</button>
      @if (menu.open()) {
        <div forMenuContent class="menu menu--wide" animate.enter="menu-pop-in">
          <div forMenuGroup>
            <div forMenuGroupLabel class="menu-label">Appearance</div>
            <button
              forMenuCheckboxItem
              class="menu-item menu-item--check"
              [(checked)]="showToolbar"
              (activate)="$event.preventDefault()"
            >
              <span forMenuItemIndicator [forceMount]="true" class="menu-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              </span>
              Show toolbar
            </button>
            <button
              forMenuCheckboxItem
              class="menu-item menu-item--check"
              [(checked)]="showSidebar"
              (activate)="$event.preventDefault()"
            >
              <span forMenuItemIndicator [forceMount]="true" class="menu-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              </span>
              Show sidebar
            </button>
          </div>

          <hr forMenuSeparator class="menu-separator" />

          <div forMenuGroup>
            <div forMenuGroupLabel class="menu-label">Sort by</div>
            <div forMenuRadioGroup [(value)]="sortBy">
              <button
                forMenuRadioItem
                value="name"
                class="menu-item menu-item--check"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="menu-indicator">
                  <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                  </svg>
                </span>
                Name
              </button>
              <button
                forMenuRadioItem
                value="date"
                class="menu-item menu-item--check"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="menu-indicator">
                  <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                  </svg>
                </span>
                Date modified
              </button>
              <button
                forMenuRadioItem
                value="size"
                class="menu-item menu-item--check"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="menu-indicator">
                  <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                  </svg>
                </span>
                Size
              </button>
            </div>
          </div>

          <hr forMenuSeparator class="menu-separator" />

          <div forMenuSub #more="forMenuSub">
            <button forMenuSubTrigger class="menu-item menu-item--check">
              <span class="menu-indicator"></span>
              More tools
              <span class="menu-sub-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </span>
            </button>
            @if (more.open()) {
              <div forMenuSubContent class="menu" animate.enter="menu-pop-in">
                <button forMenuItem class="menu-item">Developer tools</button>
                <button forMenuItem class="menu-item">Extensions</button>
                <button forMenuItem class="menu-item">Task manager</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    app-menu-default-example {
      display: contents;
    }

    .menu-trigger {
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

    .menu-trigger:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .menu {
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

    .menu--wide {
      min-width: 232px;
    }

    .menu-item {
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

    .menu-item[data-highlighted],
    .menu-item[data-state='open'],
    .menu-item:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .menu-item[data-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .menu-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .menu-indicator svg {
      width: 1em;
      height: 1em;
    }

    .menu-indicator[data-state='unchecked'] {
      opacity: 0;
    }

    .menu-sub-arrow {
      display: inline-flex;
      align-items: center;
      margin-left: auto;
      width: 1em;
      height: 1em;
      color: var(--pg-text-muted);
    }

    .menu-sub-arrow svg {
      width: 1em;
      height: 1em;
    }

    .menu-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--pg-border);
    }

    .menu-label {
      padding: 0.35rem 0.6rem 0.2rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pg-text-muted);
    }

    .menu-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: menu-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes menu-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .menu-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class MenuDefaultExample {
  protected readonly showToolbar = signal(true);
  protected readonly showSidebar = signal(false);
  protected readonly sortBy = signal('name');
}
