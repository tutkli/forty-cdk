import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DrawerBasicExample } from './examples/basic.example';
import { DrawerNestedExample } from './examples/nested.example';
import { DrawerProgrammaticExample } from './examples/programmatic.example';
import { DrawerScaleBackgroundExample } from './examples/scale-background.example';
import { DrawerSnapPointsExample } from './examples/snap-points.example';

@Component({
  selector: 'app-drawer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DrawerBasicExample,
    DrawerSnapPointsExample,
    DrawerScaleBackgroundExample,
    DrawerNestedExample,
    DrawerProgrammaticExample,
  ],
  template: `
    <primitive-page slug="drawer">
      <app-drawer-basic-example />
      <app-drawer-snap-points-example />
      <app-drawer-scale-background-example />
      <app-drawer-nested-example />
      <app-drawer-programmatic-example />
    </primitive-page>
  `,
})
export class DrawerPage {}
