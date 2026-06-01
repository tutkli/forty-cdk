import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { NavigationMenuExample } from './examples/navigation-menu.example';
import { NavigationMenuTimingExample } from './examples/timing.example';
import { NavigationMenuVerticalExample } from './examples/vertical.example';

@Component({
  selector: 'app-navigation-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    NavigationMenuExample,
    NavigationMenuTimingExample,
    NavigationMenuVerticalExample,
  ],
  template: `
    <primitive-page slug="navigation-menu">
      <app-navigation-menu-example />
      <app-navigation-menu-timing-example />
      <app-navigation-menu-vertical-example />
    </primitive-page>
  `,
})
export class NavigationMenuPage {}
