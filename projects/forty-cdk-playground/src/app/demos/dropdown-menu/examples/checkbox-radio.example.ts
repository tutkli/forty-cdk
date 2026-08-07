import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForMenuCheckboxItem,
  ForMenuContent,
  ForMenuGroup,
  ForMenuGroupLabel,
  ForMenuItemIndicator,
  ForMenuRadioGroup,
  ForMenuRadioItem,
  ForMenuSeparator,
} from 'forty-cdk/menu';

@Component({
  selector: 'app-dropdown-menu-checkbox-radio-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuCheckboxItem,
    ForMenuRadioGroup,
    ForMenuRadioItem,
    ForMenuItemIndicator,
    ForMenuGroup,
    ForMenuGroupLabel,
    ForMenuSeparator,
  ],
  template: `
    <div forDropdownMenu #menu="forDropdownMenu">
      <button forDropdownMenuTrigger class="dropdown-menu-cr-trigger">View options</button>
      @if (menu.open()) {
        <div
          forMenuContent
          class="dropdown-menu-cr dropdown-menu-cr--wide"
          animate.enter="dropdown-menu-cr-pop-in"
        >
          <div forMenuGroup>
            <div forMenuGroupLabel class="dropdown-menu-cr-label">Panels</div>
            <button
              forMenuCheckboxItem
              class="dropdown-menu-cr-item dropdown-menu-cr-item--check"
              [(checked)]="showToolbar"
              (activate)="$event.preventDefault()"
            >
              <span forMenuItemIndicator [forceMount]="true" class="dropdown-menu-cr-indicator">
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
              class="dropdown-menu-cr-item dropdown-menu-cr-item--check"
              [(checked)]="showStatusBar"
              (activate)="$event.preventDefault()"
            >
              <span forMenuItemIndicator [forceMount]="true" class="dropdown-menu-cr-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              </span>
              Show status bar
            </button>
            <button
              forMenuCheckboxItem
              class="dropdown-menu-cr-item dropdown-menu-cr-item--check"
              [(checked)]="wordWrap"
              (activate)="$event.preventDefault()"
            >
              <span forMenuItemIndicator [forceMount]="true" class="dropdown-menu-cr-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              </span>
              Word wrap
            </button>
          </div>

          <hr forMenuSeparator class="dropdown-menu-cr-separator" />

          <div forMenuGroup>
            <div forMenuGroupLabel class="dropdown-menu-cr-label">Theme</div>
            <div forMenuRadioGroup [(value)]="theme">
              <button
                forMenuRadioItem
                value="system"
                class="dropdown-menu-cr-item dropdown-menu-cr-item--check"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="dropdown-menu-cr-indicator">
                  <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                  </svg>
                </span>
                System
              </button>
              <button
                forMenuRadioItem
                value="light"
                class="dropdown-menu-cr-item dropdown-menu-cr-item--check"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="dropdown-menu-cr-indicator">
                  <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                  </svg>
                </span>
                Light
              </button>
              <button
                forMenuRadioItem
                value="dark"
                class="dropdown-menu-cr-item dropdown-menu-cr-item--check"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="dropdown-menu-cr-indicator">
                  <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                  </svg>
                </span>
                Dark
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    app-dropdown-menu-checkbox-radio-example {
      display: contents;
    }

    .dropdown-menu-cr-trigger {
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

    .dropdown-menu-cr-trigger:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .dropdown-menu-cr {
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

    .dropdown-menu-cr--wide {
      min-width: 232px;
    }

    .dropdown-menu-cr-item {
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

    .dropdown-menu-cr-item[data-highlighted],
    .dropdown-menu-cr-item[data-state='open'],
    .dropdown-menu-cr-item:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .dropdown-menu-cr-item[data-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .dropdown-menu-cr-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .dropdown-menu-cr-indicator svg {
      width: 1em;
      height: 1em;
    }

    .dropdown-menu-cr-indicator[data-state='unchecked'] {
      opacity: 0;
    }

    .dropdown-menu-cr-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--pg-border);
    }

    .dropdown-menu-cr-label {
      padding: 0.35rem 0.6rem 0.2rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pg-text-muted);
    }

    .dropdown-menu-cr-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: dropdown-menu-cr-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes dropdown-menu-cr-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dropdown-menu-cr-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DropdownMenuCheckboxRadioExample {
  protected readonly showToolbar = signal(true);
  protected readonly showStatusBar = signal(true);
  protected readonly wordWrap = signal(false);
  protected readonly theme = signal('system');
}
