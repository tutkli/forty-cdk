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
      border-radius: var(--ex-radius-sm, 14px);
      border: 1px solid var(--ex-accent, #0e7c6b);
      background: var(--ex-accent, #0e7c6b);
      color: var(--ex-accent-contrast, #ffffff);
      cursor: pointer;
    }

    .dropdown-menu-cr-trigger:hover {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }

    .dropdown-menu-cr {
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
      border-radius: var(--ex-radius-sm, 14px);
      background: transparent;
      color: var(--ex-text, #17191c);
      cursor: pointer;
    }

    .dropdown-menu-cr-item[data-highlighted],
    .dropdown-menu-cr-item[data-state='open'],
    .dropdown-menu-cr-item:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .dropdown-menu-cr-item[data-disabled] {
      color: var(--ex-muted, #585d66);
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
      color: var(--ex-accent, #0e7c6b);
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
      background: var(--ex-border, #e5e0d6);
    }

    .dropdown-menu-cr-label {
      padding: 0.35rem 0.6rem 0.2rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ex-muted, #585d66);
    }

    .dropdown-menu-cr-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: dropdown-menu-cr-pop-in 0.2s
        var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
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
  protected readonly theme = signal<string | null>('system');
}
