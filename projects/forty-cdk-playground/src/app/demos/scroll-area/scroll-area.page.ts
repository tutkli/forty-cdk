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
      <playground-demo hero sourcePath="scroll-area/examples/default.example.ts">
        <app-scroll-area-default-example />
      </playground-demo>

      <playground-demo
        title="Always-painted track"
        subtitle="<code>type='always'</code> keeps both tracks (and the corner) mounted and visible regardless of overflow. Laying the scrollbars out in flow as grid columns reserves a stable gutter, so the viewport width never shifts as content crosses the overflow boundary."
        sourcePath="scroll-area/examples/always.example.ts"
      >
        <app-scroll-area-always-example />
      </playground-demo>

      <playground-demo
        title="Geometry signals"
        subtitle='The root exposes its live scroll geometry as read-only signals via <code>exportAs</code> — <code>scrollTop</code> / <code>scrollLeft</code>, the client vs. scroll size on each axis, plus <code>hovering</code> and <code>scrolling</code>. Grab the reference with <code>#sa="forScrollArea"</code> and read them straight in the template; here they drive the readout and a scrolled-percentage bar without a single scroll listener of your own.'
        sourcePath="scroll-area/examples/geometry.example.ts"
      >
        <app-scroll-area-geometry-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ScrollAreaPage {
  protected readonly doc = DOC;
}
