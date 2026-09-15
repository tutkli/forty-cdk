import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DrawerDefaultExample } from './examples/default.example';
import { DrawerNestedExample } from './examples/nested.example';
import { DrawerProgrammaticExample } from './examples/programmatic.example';
import { DrawerRegionScopedExample } from './examples/region-scoped.example';
import { DrawerScaleBackgroundExample } from './examples/scale-background.example';
import { DrawerSnapPointsExample } from './examples/snap-points.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/drawer.generated';

@Component({
  selector: 'app-drawer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DrawerDefaultExample,
    DrawerSnapPointsExample,
    DrawerScaleBackgroundExample,
    DrawerNestedExample,
    DrawerRegionScopedExample,
    DrawerProgrammaticExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="drawer" [doc]="doc">
      <demo-layout hero sourcePath="drawer/examples/default.example.ts">
        <app-drawer-default-example />
      </demo-layout>

      <demo-layout heading="snap-points" sourcePath="drawer/examples/snap-points.example.ts">
        <app-drawer-snap-points-example />
      </demo-layout>

      <demo-layout
        heading="scale-background"
        sourcePath="drawer/examples/scale-background.example.ts"
      >
        <app-drawer-scale-background-example />
      </demo-layout>

      <demo-layout heading="nested-drawers" sourcePath="drawer/examples/nested.example.ts">
        <app-drawer-nested-example />
      </demo-layout>

      <demo-layout
        heading="region-scoped-container"
        sourcePath="drawer/examples/region-scoped.example.ts"
      >
        <app-drawer-region-scoped-example />
      </demo-layout>

      <demo-layout
        heading="programmatic-fordrawermanager"
        sourcePath="drawer/examples/programmatic.example.ts"
      >
        <app-drawer-programmatic-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class DrawerPage {
  protected readonly doc = DOC;
}
