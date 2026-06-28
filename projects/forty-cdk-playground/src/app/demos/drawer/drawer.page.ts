import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DrawerBasicExample } from './examples/basic.example';
import { DrawerNestedExample } from './examples/nested.example';
import { DrawerProgrammaticExample } from './examples/programmatic.example';
import { DrawerRegionScopedExample } from './examples/region-scoped.example';
import { DrawerScaleBackgroundExample } from './examples/scale-background.example';
import { DrawerSnapPointsExample } from './examples/snap-points.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/drawer/README.md';

@Component({
  selector: 'app-drawer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DrawerBasicExample,
    DrawerSnapPointsExample,
    DrawerScaleBackgroundExample,
    DrawerNestedExample,
    DrawerRegionScopedExample,
    DrawerProgrammaticExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="drawer" [readme]="readme">
      <app-drawer-basic-example />
      <app-drawer-snap-points-example />
      <app-drawer-scale-background-example />
      <app-drawer-nested-example />
      <app-drawer-region-scoped-example />
      <app-drawer-programmatic-example />
    </primitive-page>
  `,
})
export class DrawerPage {
  protected readonly readme = readmeContent;
}
