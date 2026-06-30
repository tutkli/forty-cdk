import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { NavigationMenuDefaultExample } from './examples/default.example';
import { NavigationMenuVerticalExample } from './examples/vertical.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/navigation-menu/README.md';

@Component({
  selector: 'app-navigation-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, NavigationMenuDefaultExample, NavigationMenuVerticalExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="navigation-menu" [readme]="readme">
      <playground-demo
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/navigation-menu/examples/default.example.ts"
      >
        <app-navigation-menu-default-example />
      </playground-demo>

      <playground-demo
        title="Vertical orientation"
        subtitle="<code>orientation='vertical'</code> stacks the triggers into a sidebar and swaps the keyboard axis: <kbd>ArrowUp</kbd> / <kbd>ArrowDown</kbd> move focus across triggers, <kbd>ArrowRight</kbd> opens the focused panel. Each panel flies out beside its trigger and the indicator becomes a vertical bar tracking the active row."
        sourcePath="projects/forty-cdk-playground/src/app/demos/navigation-menu/examples/vertical.example.ts"
      >
        <app-navigation-menu-vertical-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class NavigationMenuPage {
  protected readonly readme = readmeContent;
}
