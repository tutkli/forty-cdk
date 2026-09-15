import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForMenuContent,
  ForMenuItem,
  ForMenuSeparator,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk/menu';

@Component({
  selector: 'app-dropdown-menu-submenus-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSeparator,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  template: `
    <div forDropdownMenu #menu="forDropdownMenu">
      <button forDropdownMenuTrigger class="dropdown-menu-sub-trigger">Share</button>
      @if (menu.open()) {
        <div
          forMenuContent
          class="dropdown-menu-sub dropdown-menu-sub--wide"
          animate.enter="dropdown-menu-sub-pop-in"
        >
          <button forMenuItem class="dropdown-menu-sub-item">Copy link</button>
          <button forMenuItem class="dropdown-menu-sub-item">Email</button>

          <hr forMenuSeparator class="dropdown-menu-sub-separator" />

          <div forMenuSub #invite="forMenuSub">
            <button forMenuSubTrigger class="dropdown-menu-sub-item">
              Invite people
              <span class="dropdown-menu-sub-arrow" aria-hidden="true">
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
            @if (invite.open()) {
              <div
                forMenuSubContent
                class="dropdown-menu-sub"
                animate.enter="dropdown-menu-sub-pop-in"
              >
                <button forMenuItem class="dropdown-menu-sub-item">By email</button>
                <button forMenuItem class="dropdown-menu-sub-item">By link</button>

                <hr forMenuSeparator class="dropdown-menu-sub-separator" />

                <div forMenuSub #role="forMenuSub">
                  <button forMenuSubTrigger class="dropdown-menu-sub-item">
                    Set role
                    <span class="dropdown-menu-sub-arrow" aria-hidden="true">
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
                  @if (role.open()) {
                    <div
                      forMenuSubContent
                      class="dropdown-menu-sub"
                      animate.enter="dropdown-menu-sub-pop-in"
                    >
                      <button forMenuItem class="dropdown-menu-sub-item">Viewer</button>
                      <button forMenuItem class="dropdown-menu-sub-item">Editor</button>
                      <button forMenuItem class="dropdown-menu-sub-item">Admin</button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <hr forMenuSeparator class="dropdown-menu-sub-separator" />

          <button forMenuItem class="dropdown-menu-sub-item">Manage access</button>
        </div>
      }
    </div>
  `,
  styles: `
    app-dropdown-menu-submenus-example {
      display: contents;
    }

    .dropdown-menu-sub-trigger {
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

    .dropdown-menu-sub-trigger:hover {
      background: var(--ex-accent-hover, #0a5a4d);
      border-color: var(--ex-accent-hover, #0a5a4d);
    }

    .dropdown-menu-sub {
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

    .dropdown-menu-sub--wide {
      min-width: 232px;
    }

    .dropdown-menu-sub-item {
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

    .dropdown-menu-sub-item[data-highlighted],
    .dropdown-menu-sub-item[data-state='open'],
    .dropdown-menu-sub-item:not([data-disabled]):hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .dropdown-menu-sub-item[data-disabled] {
      color: var(--ex-muted, #585d66);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .dropdown-menu-sub-arrow {
      display: inline-flex;
      align-items: center;
      margin-left: auto;
      width: 1em;
      height: 1em;
      color: var(--ex-muted, #585d66);
    }

    .dropdown-menu-sub-arrow svg {
      width: 1em;
      height: 1em;
    }

    .dropdown-menu-sub-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--ex-border, #e5e0d6);
    }

    .dropdown-menu-sub-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: dropdown-menu-sub-pop-in 0.2s
        var(--ex-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
    }

    @keyframes dropdown-menu-sub-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dropdown-menu-sub-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class DropdownMenuSubmenusExample {}
