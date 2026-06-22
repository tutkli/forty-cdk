import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
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

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-navigation-menu-timing-example',
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
    ForNavigationMenuViewport,
    ControlSelect,
    Icon,
  ],
  template: `
    <playground-demo
      title="Open & close timing"
      subtitle="The full hover timing model is three numbers. delayDuration is the pause before a panel opens on hover or focus. closeDelay is the grace period before it closes after the pointer leaves, so a quick diagonal slide into the panel doesn't dismiss it. skipDelayDuration is the window after one panel closes during which the next trigger opens instantly — that's what makes sweeping across a menu bar feel immediate instead of stuttering at every trigger. Turn delayDuration up to 700 ms, then sweep quickly between triggers to feel the skip window in action."
      sourcePath="projects/forty-cdk-playground/src/app/demos/navigation-menu/examples/timing.example.ts"
    >
      <div demo class="nav-demo">
        <nav
          forNavigationMenu
          [(value)]="open"
          [delayDuration]="delay()"
          [closeDelay]="close()"
          [skipDelayDuration]="skip()"
          ariaLabel="Timing"
          class="pg-navmenu"
        >
          <ul forNavigationMenuList class="pg-navmenu-list">
            <li forNavigationMenuItem value="products" class="pg-navmenu-item">
              <button forNavigationMenuTrigger class="pg-navmenu-trigger">
                Products
                <app-icon class="pg-navmenu-chevron" name="chevron-down" />
              </button>
              @if (open() === 'products') {
                <div forNavigationMenuContent data-id="products" class="pg-navmenu-panel">
                  <p class="pg-navmenu-panel-title">Build</p>
                  <div class="pg-navmenu-grid">
                    <a forNavigationMenuLink href="#analytics" class="pg-navmenu-link">
                      <strong>Analytics</strong>
                      <span>Dashboards and funnels</span>
                    </a>
                    <a forNavigationMenuLink href="#automation" class="pg-navmenu-link">
                      <strong>Automation</strong>
                      <span>Workflows and triggers</span>
                    </a>
                    <a forNavigationMenuLink href="#reports" class="pg-navmenu-link">
                      <strong>Reports</strong>
                      <span>Scheduled exports</span>
                    </a>
                    <a forNavigationMenuLink href="#integrations" class="pg-navmenu-link">
                      <strong>Integrations</strong>
                      <span>Connect your stack</span>
                    </a>
                  </div>
                </div>
              }
            </li>

            <li forNavigationMenuItem value="solutions" class="pg-navmenu-item">
              <button forNavigationMenuTrigger class="pg-navmenu-trigger">
                Solutions
                <app-icon class="pg-navmenu-chevron" name="chevron-down" />
              </button>
              @if (open() === 'solutions') {
                <div forNavigationMenuContent data-id="solutions" class="pg-navmenu-panel">
                  <p class="pg-navmenu-panel-title">By team</p>
                  <ul class="pg-navmenu-links">
                    <li>
                      <a forNavigationMenuLink href="#startups" class="pg-navmenu-link">Startups</a>
                    </li>
                    <li>
                      <a forNavigationMenuLink href="#enterprise" class="pg-navmenu-link">
                        Enterprise
                      </a>
                    </li>
                    <li>
                      <a forNavigationMenuLink href="#agencies" class="pg-navmenu-link">Agencies</a>
                    </li>
                  </ul>
                </div>
              }
            </li>

            <li forNavigationMenuItem value="company" class="pg-navmenu-item">
              <button forNavigationMenuTrigger class="pg-navmenu-trigger">
                Company
                <app-icon class="pg-navmenu-chevron" name="chevron-down" />
              </button>
              @if (open() === 'company') {
                <div forNavigationMenuContent data-id="company" class="pg-navmenu-panel">
                  <p class="pg-navmenu-panel-title">About us</p>
                  <ul class="pg-navmenu-links">
                    <li>
                      <a forNavigationMenuLink href="#about" class="pg-navmenu-link">About</a>
                    </li>
                    <li>
                      <a forNavigationMenuLink href="#careers" class="pg-navmenu-link">Careers</a>
                    </li>
                    <li><a forNavigationMenuLink href="#blog" class="pg-navmenu-link">Blog</a></li>
                  </ul>
                </div>
              }
            </li>

            <div forNavigationMenuIndicator class="pg-navmenu-indicator" aria-hidden="true"></div>
          </ul>

          <div class="pg-navmenu-viewport-wrap">
            <div forNavigationMenuViewport class="pg-navmenu-viewport"></div>
          </div>
        </nav>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="delayDuration"
          hint="Milliseconds to wait after hover or focus before a panel opens. 0 opens instantly."
          [options]="msOptions"
          [(value)]="delayValue"
        />
        <app-control-select
          label="closeDelay"
          hint="Milliseconds the panel stays open after the pointer leaves, so a quick slide into the panel doesn't dismiss it."
          [options]="msOptions"
          [(value)]="closeValue"
        />
        <app-control-select
          label="skipDelayDuration"
          hint="Window after a panel closes during which the next trigger opens instantly, ignoring delayDuration. Keeps sweeping across the bar responsive."
          [options]="msOptions"
          [(value)]="skipValue"
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
      padding: 1rem 0 12rem;
    }
  `,
})
export class NavigationMenuTimingExample {
  protected readonly msOptions: readonly ControlOption[] = [
    { value: '0', label: '0 ms' },
    { value: '150', label: '150 ms' },
    { value: '300', label: '300 ms' },
    { value: '700', label: '700 ms' },
  ];

  protected readonly open = signal('');

  protected readonly delayValue = signal('700');
  protected readonly closeValue = signal('300');
  protected readonly skipValue = signal('300');

  protected readonly delay = computed(() => Number(this.delayValue()));
  protected readonly close = computed(() => Number(this.closeValue()));
  protected readonly skip = computed(() => Number(this.skipValue()));
}
