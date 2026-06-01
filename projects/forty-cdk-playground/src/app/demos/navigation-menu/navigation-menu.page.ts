import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { NavigationMenuExample } from './examples/navigation-menu.example';

@Component({
  selector: 'app-navigation-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, NavigationMenuExample],
  template: `
    <primitive-page slug="navigation-menu">
      <app-navigation-menu-example />
    </primitive-page>
  `,
})
export class NavigationMenuPage {}
