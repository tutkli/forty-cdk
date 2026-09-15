import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { NavigationMenuDefaultExample } from './examples/default.example';
import { NavigationMenuVerticalExample } from './examples/vertical.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/navigation-menu.generated';

@Component({
  selector: 'app-navigation-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, NavigationMenuDefaultExample, NavigationMenuVerticalExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="navigation-menu" [doc]="doc">
      <demo-layout hero sourcePath="navigation-menu/examples/default.example.ts">
        <app-navigation-menu-default-example />
      </demo-layout>

      <demo-layout
        heading="vertical-orientation"
        sourcePath="navigation-menu/examples/vertical.example.ts"
      >
        <app-navigation-menu-vertical-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class NavigationMenuPage {
  protected readonly doc = DOC;
}
