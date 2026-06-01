import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuIndicator,
  ForNavigationMenuItem,
  ForNavigationMenuLink,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
} from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-navigation-menu-vertical-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
    ForNavigationMenuIndicator,
    ControlSwitch,
    Icon,
  ],
  template: `
    <playground-demo
      title="Vertical orientation"
      subtitle="orientation='vertical' stacks the triggers into a sidebar and swaps the keyboard axis: ArrowUp / ArrowDown move focus across triggers, ArrowRight opens the focused panel (ArrowLeft in RTL), and the root reflects data-orientation='vertical' so CSS can flip the layout. Each panel flies out beside its trigger instead of dropping below; the indicator becomes a vertical bar tracking the active row. Without a shared viewport here, every item simply mounts its own panel via @if."
      sourcePath="projects/forty-cdk-playground/src/app/demos/navigation-menu/examples/vertical.example.ts"
    >
      <div demo class="nav-demo">
        <nav
          forNavigationMenu
          orientation="vertical"
          [(value)]="open"
          [loop]="loop()"
          ariaLabel="Workspace"
          class="pg-navmenu pg-navmenu--vertical"
        >
          <ul forNavigationMenuList class="pg-navmenu-list pg-navmenu-list--vertical">
            <li forNavigationMenuItem value="library" class="pg-navmenu-item">
              <button forNavigationMenuTrigger class="pg-navmenu-trigger pg-navmenu-trigger--row">
                Library
                <app-icon class="pg-navmenu-chevron pg-navmenu-chevron--row" name="chevron-right" />
              </button>
              @if (open() === 'library') {
                <div forNavigationMenuContent data-id="library" class="pg-navmenu-panel">
                  <p class="pg-navmenu-panel-title">Collections</p>
                  <ul class="pg-navmenu-links">
                    <li>
                      <a forNavigationMenuLink [active]="true" href="#all" class="pg-navmenu-link">
                        All items
                      </a>
                    </li>
                    <li>
                      <a forNavigationMenuLink href="#favorites" class="pg-navmenu-link">
                        Favorites
                      </a>
                    </li>
                    <li>
                      <a forNavigationMenuLink href="#archived" class="pg-navmenu-link">Archived</a>
                    </li>
                  </ul>
                </div>
              }
            </li>

            <li forNavigationMenuItem value="team" class="pg-navmenu-item">
              <button forNavigationMenuTrigger class="pg-navmenu-trigger pg-navmenu-trigger--row">
                Team
                <app-icon class="pg-navmenu-chevron pg-navmenu-chevron--row" name="chevron-right" />
              </button>
              @if (open() === 'team') {
                <div forNavigationMenuContent data-id="team" class="pg-navmenu-panel">
                  <p class="pg-navmenu-panel-title">People</p>
                  <ul class="pg-navmenu-links">
                    <li>
                      <a forNavigationMenuLink href="#members" class="pg-navmenu-link">Members</a>
                    </li>
                    <li>
                      <a forNavigationMenuLink href="#invitations" class="pg-navmenu-link">
                        Invitations
                      </a>
                    </li>
                    <li>
                      <a forNavigationMenuLink href="#roles" class="pg-navmenu-link">Roles</a>
                    </li>
                  </ul>
                </div>
              }
            </li>

            <li forNavigationMenuItem value="settings" class="pg-navmenu-item">
              <button forNavigationMenuTrigger class="pg-navmenu-trigger pg-navmenu-trigger--row">
                Settings
                <app-icon class="pg-navmenu-chevron pg-navmenu-chevron--row" name="chevron-right" />
              </button>
              @if (open() === 'settings') {
                <div forNavigationMenuContent data-id="settings" class="pg-navmenu-panel">
                  <p class="pg-navmenu-panel-title">Workspace</p>
                  <ul class="pg-navmenu-links">
                    <li>
                      <a forNavigationMenuLink href="#general" class="pg-navmenu-link">General</a>
                    </li>
                    <li>
                      <a forNavigationMenuLink href="#billing" class="pg-navmenu-link">Billing</a>
                    </li>
                    <li>
                      <a forNavigationMenuLink href="#security" class="pg-navmenu-link">Security</a>
                    </li>
                  </ul>
                </div>
              }
            </li>

            <div
              forNavigationMenuIndicator
              class="pg-navmenu-indicator pg-navmenu-indicator--vertical"
              aria-hidden="true"
            ></div>
          </ul>
        </nav>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="loop"
          hint="When on, ArrowUp on the first trigger wraps to the last and vice versa."
          [(checked)]="loop"
        />

        <p class="pg-state">
          open: <b>{{ open() || 'none' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .nav-demo {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 1rem 0;
      min-height: 240px;
    }

    .pg-navmenu--vertical {
      display: inline-flex;
    }

    .pg-navmenu-list--vertical {
      flex-direction: column;
      gap: 0.15rem;
      min-width: 200px;
    }

    .pg-navmenu-trigger--row {
      width: 100%;
      justify-content: flex-start;
    }

    .pg-navmenu-chevron--row {
      margin-inline-start: auto;
    }

    .pg-navmenu--vertical .pg-navmenu-item {
      position: relative;
    }

    .pg-navmenu--vertical .pg-navmenu-panel {
      position: absolute;
      top: 0;
      inset-inline-start: calc(100% + 0.6rem);
      width: 240px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
      z-index: 60;
    }

    .pg-navmenu-indicator--vertical {
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

    @media (prefers-reduced-motion: reduce) {
      .pg-navmenu-indicator--vertical {
        transition: none;
      }
    }
  `,
})
export class NavigationMenuVerticalExample {
  protected readonly open = signal('');
  protected readonly loop = signal(true);
}
