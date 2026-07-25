import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuItem,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
  ForNavigationMenuViewport,
} from 'forty-cdk/navigation-menu';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-navigation-menu-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuViewport,
  ],
  styles: [
    `
      [forNavigationMenuViewport] {
        display: block;
        overflow: hidden;
        width: var(--for-navigation-menu-viewport-width);
        height: var(--for-navigation-menu-viewport-height);
      }
      [forNavigationMenuContent] {
        display: block;
        box-sizing: border-box;
      }
      [forNavigationMenuContent][data-id='products'] {
        width: 320px;
        height: 240px;
      }
      [forNavigationMenuContent][data-id='solutions'] {
        width: 480px;
        height: 120px;
      }
      [forNavigationMenuContent][data-id='company'] {
        width: 240px;
        height: 360px;
      }
    `,
  ],
  template: `
    <input data-testid="before" type="text" />

    <nav forNavigationMenu [(value)]="open">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button data-testid="trigger-products" forNavigationMenuTrigger>Products</button>
          @if (open() === 'products') {
            <div forNavigationMenuContent data-id="products" data-testid="content-products">
              <a data-testid="link-products-1" href="#products-web">Web</a>
              <a data-testid="link-products-2" href="#products-mobile">Mobile</a>
            </div>
          }
        </li>
        <li forNavigationMenuItem value="solutions" [disabled]="disabledSolutions">
          <button data-testid="trigger-solutions" forNavigationMenuTrigger>Solutions</button>
          @if (open() === 'solutions') {
            <div forNavigationMenuContent data-id="solutions" data-testid="content-solutions">
              <a data-testid="link-solutions-1" href="#solutions-a">Solution A</a>
            </div>
          }
        </li>
        <li forNavigationMenuItem value="company">
          <button data-testid="trigger-company" forNavigationMenuTrigger>Company</button>
          @if (open() === 'company') {
            <div forNavigationMenuContent data-id="company" data-testid="content-company">
              <a data-testid="link-company-1" href="#company-about">About</a>
            </div>
          }
        </li>
      </ul>
      <ng-template #viewportTpl>
        <div forNavigationMenuViewport data-testid="viewport"></div>
      </ng-template>
      @if (!noViewport && !externalViewport) {
        <ng-container [ngTemplateOutlet]="viewportTpl" />
      }
    </nav>

    @if (externalViewport) {
      <div data-testid="external-viewport-host">
        <ng-container [ngTemplateOutlet]="viewportTpl" />
      </div>
    }

    <input data-testid="after" type="text" />

    <output data-testid="active">{{ activeDisplay() }}</output>
  `,
})
export class NavigationMenuFixture {
  protected readonly open = signal('');
  protected readonly noViewport = queryFlag('noViewport');
  protected readonly externalViewport = queryFlag('externalViewport');
  protected readonly disabledSolutions = queryFlag('disabledSolutions');
  protected readonly activeDisplay = computed(() => this.open() || 'none');
}
