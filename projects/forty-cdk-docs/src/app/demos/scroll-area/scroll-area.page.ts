import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ScrollAreaAlwaysExample } from './examples/always.example';
import { ScrollAreaDefaultExample } from './examples/default.example';
import { ScrollAreaGeometryExample } from './examples/geometry.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/scroll-area.generated';

@Component({
  selector: 'app-scroll-area-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    ScrollAreaDefaultExample,
    ScrollAreaAlwaysExample,
    ScrollAreaGeometryExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="scroll-area" [doc]="doc">
      <demo-layout hero sourcePath="scroll-area/examples/default.example.ts">
        <app-scroll-area-default-example />
      </demo-layout>

      <demo-layout
        heading="always-painted-track"
        sourcePath="scroll-area/examples/always.example.ts"
      >
        <app-scroll-area-always-example />
      </demo-layout>

      <demo-layout heading="geometry-signals" sourcePath="scroll-area/examples/geometry.example.ts">
        <app-scroll-area-geometry-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class ScrollAreaPage {
  protected readonly doc = DOC;
}
