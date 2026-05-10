import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuItem,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
  ForNavigationMenuViewport,
} from 'forty-cdk';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-navigation-menu-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
    <nav forNavigationMenu [(value)]="open">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button data-testid="trigger-products" forNavigationMenuTrigger>Products</button>
          @if (open() === 'products') {
            <div forNavigationMenuContent data-id="products" data-testid="content-products">
              products panel
            </div>
          }
        </li>
        <li forNavigationMenuItem value="solutions">
          <button data-testid="trigger-solutions" forNavigationMenuTrigger>Solutions</button>
          @if (open() === 'solutions') {
            <div forNavigationMenuContent data-id="solutions" data-testid="content-solutions">
              solutions panel
            </div>
          }
        </li>
        <li forNavigationMenuItem value="company">
          <button data-testid="trigger-company" forNavigationMenuTrigger>Company</button>
          @if (open() === 'company') {
            <div forNavigationMenuContent data-id="company" data-testid="content-company">
              company panel
            </div>
          }
        </li>
      </ul>
      @if (!noViewport) {
        <div forNavigationMenuViewport data-testid="viewport"></div>
      }
    </nav>

    <output data-testid="active">{{ activeDisplay() }}</output>
  `,
})
export class NavigationMenuFixture {
  protected readonly open = signal('');
  protected readonly noViewport = queryFlag('noViewport');
  protected readonly activeDisplay = computed(() => this.open() || 'none');
}
