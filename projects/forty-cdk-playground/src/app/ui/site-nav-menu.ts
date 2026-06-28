import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuIndicator,
  ForNavigationMenuItem,
  ForNavigationMenuLink,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
  ForNavigationMenuViewport,
} from 'forty-cdk/navigation-menu';
import { filter } from 'rxjs';

import { PLAYGROUND_GROUPS } from '../primitives';
import { GITHUB_REPO } from './github';
import { Icon } from './icon';

@Component({
  selector: 'site-nav-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
    ForNavigationMenuIndicator,
    ForNavigationMenuViewport,
    Icon,
  ],
  template: `
    <nav forNavigationMenu [(value)]="open" ariaLabel="Site" class="pg-navmenu">
      <ul forNavigationMenuList class="pg-navmenu-list">
        <li forNavigationMenuItem value="components" class="pg-navmenu-item">
          <button forNavigationMenuTrigger class="pg-navmenu-trigger">
            Components
            <app-icon class="pg-navmenu-chevron" name="chevron-down" />
          </button>
          @if (open() === 'components') {
            <div forNavigationMenuContent data-id="components" class="pg-navmenu-panel snm-panel">
              <div class="snm-grid">
                @for (group of groups; track group.label) {
                  <div class="snm-col">
                    <p class="pg-navmenu-panel-title">{{ group.label }}</p>
                    <ul class="pg-navmenu-links">
                      @for (item of group.primitives; track item.slug) {
                        <li>
                          <a
                            forNavigationMenuLink
                            [routerLink]="['/', item.slug]"
                            routerLinkActive
                            #rla="routerLinkActive"
                            [active]="rla.isActive"
                            class="pg-navmenu-link snm-link"
                          >
                            {{ item.title }}
                          </a>
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </div>
          }
        </li>

        <li class="pg-navmenu-item">
          <a
            [href]="repo"
            target="_blank"
            rel="noreferrer noopener"
            class="pg-navmenu-trigger pg-navmenu-trigger--link"
          >
            <app-icon name="github" />
            GitHub
          </a>
        </li>

        <div forNavigationMenuIndicator class="pg-navmenu-indicator" aria-hidden="true"></div>
      </ul>

      <div class="pg-navmenu-viewport-wrap">
        <div forNavigationMenuViewport class="pg-navmenu-viewport"></div>
      </div>
    </nav>
  `,
})
export class SiteNavMenu {
  protected readonly groups = PLAYGROUND_GROUPS;
  protected readonly repo = GITHUB_REPO;

  protected readonly open = signal('');

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(''));
  }
}
