import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { NavigationMenuExample } from './examples/navigation-menu.example';
import { NavigationMenuTimingExample } from './examples/timing.example';
import { NavigationMenuVerticalExample } from './examples/vertical.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/navigation-menu/README.md';

@Component({
  selector: 'app-navigation-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    NavigationMenuExample,
    NavigationMenuTimingExample,
    NavigationMenuVerticalExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="navigation-menu" [readme]="readme">
      <app-navigation-menu-example />
      <app-navigation-menu-timing-example />
      <app-navigation-menu-vertical-example />
    </primitive-page>
  `,
})
export class NavigationMenuPage {
  protected readonly readme = readmeContent;
}
