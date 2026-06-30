import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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

@Component({
  selector: 'app-navigation-menu-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
    ForNavigationMenuIndicator,
    ForNavigationMenuViewport,
  ],
  template: `
    <div class="nav-demo">
      <nav forNavigationMenu [(value)]="open" ariaLabel="Main" class="navmenu">
        <ul forNavigationMenuList class="navmenu-list">
          <li forNavigationMenuItem value="products" class="navmenu-item">
            <button forNavigationMenuTrigger class="navmenu-trigger">
              Products
              <svg class="navmenu-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (open() === 'products') {
              <div forNavigationMenuContent data-id="products" class="navmenu-panel">
                <p class="navmenu-panel-title">Build</p>
                <div class="navmenu-grid">
                  <a forNavigationMenuLink [active]="true" href="#analytics" class="navmenu-link">
                    <strong>Analytics</strong>
                    <span>Dashboards and funnels</span>
                  </a>
                  <a forNavigationMenuLink href="#automation" class="navmenu-link">
                    <strong>Automation</strong>
                    <span>Workflows and triggers</span>
                  </a>
                  <a forNavigationMenuLink href="#reports" class="navmenu-link">
                    <strong>Reports</strong>
                    <span>Scheduled exports</span>
                  </a>
                  <a forNavigationMenuLink href="#integrations" class="navmenu-link">
                    <strong>Integrations</strong>
                    <span>Connect your stack</span>
                  </a>
                </div>
              </div>
            }
          </li>

          <li forNavigationMenuItem value="solutions" class="navmenu-item">
            <button forNavigationMenuTrigger class="navmenu-trigger">
              Solutions
              <svg class="navmenu-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (open() === 'solutions') {
              <div forNavigationMenuContent data-id="solutions" class="navmenu-panel">
                <p class="navmenu-panel-title">By team</p>
                <ul class="navmenu-links">
                  <li>
                    <a forNavigationMenuLink href="#startups" class="navmenu-link">Startups</a>
                  </li>
                  <li>
                    <a forNavigationMenuLink href="#enterprise" class="navmenu-link">Enterprise</a>
                  </li>
                  <li>
                    <a forNavigationMenuLink href="#agencies" class="navmenu-link">Agencies</a>
                  </li>
                </ul>
              </div>
            }
          </li>

          <li forNavigationMenuItem value="company" class="navmenu-item">
            <button forNavigationMenuTrigger class="navmenu-trigger">
              Company
              <svg class="navmenu-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            @if (open() === 'company') {
              <div forNavigationMenuContent data-id="company" class="navmenu-panel">
                <p class="navmenu-panel-title">About us</p>
                <ul class="navmenu-links">
                  <li><a forNavigationMenuLink href="#about" class="navmenu-link">About</a></li>
                  <li><a forNavigationMenuLink href="#careers" class="navmenu-link">Careers</a></li>
                  <li><a forNavigationMenuLink href="#blog" class="navmenu-link">Blog</a></li>
                </ul>
              </div>
            }
          </li>

          <li class="navmenu-item">
            <a href="#pricing" class="navmenu-trigger navmenu-trigger--link">Pricing</a>
          </li>

          <div forNavigationMenuIndicator class="navmenu-indicator" aria-hidden="true"></div>
        </ul>

        <div class="navmenu-viewport-wrap">
          <div forNavigationMenuViewport class="navmenu-viewport"></div>
        </div>
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
      padding: 1rem 0 12rem;
    }

    .navmenu {
      position: relative;
      display: inline-block;
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

    .navmenu-item {
      display: flex;
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

    .navmenu-chevron {
      width: 1em;
      height: 1em;
      transition: transform 0.2s ease;
    }

    .navmenu-trigger[data-state='open'] .navmenu-chevron {
      transform: rotate(180deg);
    }

    .navmenu-indicator {
      position: absolute;
      bottom: -5px;
      left: 0;
      height: 2px;
      width: var(--for-navigation-menu-indicator-width, 0px);
      transform: translateX(var(--for-navigation-menu-indicator-x, 0px));
      background: var(--pg-primary);
      border-radius: 999px;
      transition:
        transform 0.22s ease,
        width 0.22s ease,
        opacity 0.18s ease;
    }

    .navmenu-indicator[data-state='hidden'] {
      opacity: 0;
    }

    .navmenu-viewport-wrap {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 60;
      display: flex;
    }

    .navmenu-viewport {
      position: relative;
      margin-top: 0.5rem;
      width: var(--for-navigation-menu-viewport-width, 0px);
      height: var(--for-navigation-menu-viewport-height, 0px);
      overflow: hidden;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
      transition:
        width 0.25s ease,
        height 0.25s ease,
        opacity 0.2s ease;
    }

    .navmenu-viewport[data-state='closed'] {
      opacity: 0;
      border-color: transparent;
      box-shadow: none;
    }

    .navmenu-panel {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      padding: 1.1rem;
    }

    .navmenu-panel[data-id='products'] {
      width: 400px;
    }

    .navmenu-panel[data-id='solutions'] {
      width: 300px;
    }

    .navmenu-panel[data-id='company'] {
      width: 260px;
    }

    .navmenu-panel-title {
      margin: 0 0 0.6rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pg-text-muted);
    }

    .navmenu-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem;
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

    .navmenu-link span {
      font-size: 0.8rem;
      color: var(--pg-text-muted);
    }

    .navmenu-link:hover {
      background: var(--pg-surface-2);
    }

    .navmenu-link[data-active] {
      background: color-mix(in srgb, var(--pg-primary) 14%, transparent);
      color: var(--pg-primary);
    }

    @media (prefers-reduced-motion: reduce) {
      .navmenu-chevron,
      .navmenu-indicator,
      .navmenu-viewport {
        transition: none;
      }
    }
  `,
})
export class NavigationMenuDefaultExample {
  protected readonly open = signal('');
}
