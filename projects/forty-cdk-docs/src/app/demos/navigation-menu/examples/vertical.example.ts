import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuIndicator,
  ForNavigationMenuItem,
  ForNavigationMenuLink,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
} from 'forty-cdk/navigation-menu';

@Component({
  selector: 'app-navigation-menu-vertical-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
    ForNavigationMenuIndicator,
  ],
  template: `
    <div class="nav-demo">
      <nav
        forNavigationMenu
        orientation="vertical"
        [(value)]="open"
        ariaLabel="Workspace"
        class="navmenu navmenu--vertical"
      >
        <ul forNavigationMenuList class="navmenu-list navmenu-list--vertical">
          <li forNavigationMenuItem value="library" class="navmenu-item">
            <button forNavigationMenuTrigger class="navmenu-trigger navmenu-trigger--row">
              Library
              <svg
                class="navmenu-chevron navmenu-chevron--row"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (open() === 'library') {
              <div forNavigationMenuContent data-id="library" class="navmenu-panel">
                <p class="navmenu-panel-title">Collections</p>
                <ul class="navmenu-links">
                  <li>
                    <a forNavigationMenuLink [active]="true" href="#all" class="navmenu-link">
                      All items
                    </a>
                  </li>
                  <li>
                    <a forNavigationMenuLink href="#favorites" class="navmenu-link">Favorites</a>
                  </li>
                  <li>
                    <a forNavigationMenuLink href="#archived" class="navmenu-link">Archived</a>
                  </li>
                </ul>
              </div>
            }
          </li>

          <li forNavigationMenuItem value="team" class="navmenu-item">
            <button forNavigationMenuTrigger class="navmenu-trigger navmenu-trigger--row">
              Team
              <svg
                class="navmenu-chevron navmenu-chevron--row"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (open() === 'team') {
              <div forNavigationMenuContent data-id="team" class="navmenu-panel">
                <p class="navmenu-panel-title">People</p>
                <ul class="navmenu-links">
                  <li><a forNavigationMenuLink href="#members" class="navmenu-link">Members</a></li>
                  <li>
                    <a forNavigationMenuLink href="#invitations" class="navmenu-link"
                      >Invitations</a
                    >
                  </li>
                  <li><a forNavigationMenuLink href="#roles" class="navmenu-link">Roles</a></li>
                </ul>
              </div>
            }
          </li>

          <li forNavigationMenuItem value="settings" class="navmenu-item">
            <button forNavigationMenuTrigger class="navmenu-trigger navmenu-trigger--row">
              Settings
              <svg
                class="navmenu-chevron navmenu-chevron--row"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (open() === 'settings') {
              <div forNavigationMenuContent data-id="settings" class="navmenu-panel">
                <p class="navmenu-panel-title">Workspace</p>
                <ul class="navmenu-links">
                  <li><a forNavigationMenuLink href="#general" class="navmenu-link">General</a></li>
                  <li><a forNavigationMenuLink href="#billing" class="navmenu-link">Billing</a></li>
                  <li>
                    <a forNavigationMenuLink href="#security" class="navmenu-link">Security</a>
                  </li>
                </ul>
              </div>
            }
          </li>

          <div
            forNavigationMenuIndicator
            class="navmenu-indicator navmenu-indicator--vertical"
            aria-hidden="true"
          ></div>
        </ul>
      </nav>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .nav-demo {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 1rem 0;
      min-height: 240px;
    }

    .navmenu {
      position: relative;
      display: inline-block;
    }

    .navmenu--vertical {
      display: inline-flex;
    }

    .navmenu-list {
      position: relative;
      display: flex;
      gap: 0.25rem;
      margin: 0;
      padding: 4px;
      list-style: none;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .navmenu-list--vertical {
      flex-direction: column;
      gap: 0.15rem;
      min-width: 200px;
    }

    .navmenu-item {
      display: flex;
    }

    .navmenu--vertical .navmenu-item {
      position: relative;
    }

    .navmenu-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      padding: 0.45rem 0.7rem;
      border: 0;
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text);
      cursor: pointer;
    }

    .navmenu-trigger:hover,
    .navmenu-trigger[data-state='open'] {
      background: var(--pg-surface-2);
    }

    .navmenu-trigger--row {
      width: 100%;
      justify-content: flex-start;
    }

    .navmenu-chevron {
      width: 1em;
      height: 1em;
      transition: transform 0.2s ease;
    }

    .navmenu-chevron--row {
      margin-inline-start: auto;
    }

    .navmenu-panel {
      position: absolute;
      top: 0;
      inset-inline-start: calc(100% + 0.6rem);
      width: 240px;
      box-sizing: border-box;
      padding: 1.1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
      z-index: 60;
    }

    .navmenu-panel-title {
      margin: 0 0 0.6rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pg-text-muted);
    }

    .navmenu-links {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .navmenu-link {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      padding: 0.5rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      color: var(--pg-text);
      text-decoration: none;
    }

    .navmenu-link:hover {
      background: var(--pg-surface-2);
    }

    .navmenu-link[data-active] {
      background: color-mix(in srgb, var(--pg-primary) 14%, transparent);
      color: var(--pg-primary);
    }

    .navmenu-indicator {
      position: absolute;
      background: var(--pg-primary);
      border-radius: 999px;
    }

    .navmenu-indicator--vertical {
      top: 0;
      bottom: auto;
      left: 0;
      width: 2px;
      height: var(--for-navigation-menu-indicator-height, 0px);
      transform: translateY(var(--for-navigation-menu-indicator-y, 0px));
      transition:
        transform 0.22s ease,
        height 0.22s ease,
        opacity 0.18s ease;
    }

    .navmenu-indicator[data-state='hidden'] {
      opacity: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      .navmenu-chevron,
      .navmenu-indicator {
        transition: none;
      }
    }
  `,
})
export class NavigationMenuVerticalExample {
  protected readonly open = signal<string | null>(null);
}
