import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DragDropAutoScrollExample } from './examples/auto-scroll.example';
import { DragDropConstraintsExample } from './examples/constraints.example';
import { DragDropFreeDragExample } from './examples/free-drag.example';
import { DragDropMixedGridExample } from './examples/mixed-grid.example';
import { DragDropSortableExample } from './examples/sortable.example';
import { DragDropTransferExample } from './examples/transfer.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/drag-drop/README.md';

@Component({
  selector: 'app-drag-drop-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DragDropSortableExample,
    DragDropAutoScrollExample,
    DragDropTransferExample,
    DragDropConstraintsExample,
    DragDropMixedGridExample,
    DragDropFreeDragExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="drag-drop" [readme]="readme">
      <playground-demo hero sourcePath="drag-drop/examples/sortable.example.ts">
        <app-drag-drop-sortable-example />
      </playground-demo>

      <playground-demo
        title="Drag follows scroll (auto-scroll)"
        subtitle="When a pointer drag reaches the edge of the nearest scrollable container, <code>[forDropList]</code> auto-scrolls it toward that edge so you can drop on items far outside the visible window. The edge zone and max speed are tuned via <code>provideForDragDropDefaults</code>. Keyboard dragging is unaffected."
        sourcePath="drag-drop/examples/auto-scroll.example.ts"
      >
        <app-drag-drop-auto-scroll-example />
      </playground-demo>

      <playground-demo
        title="Transfer between lists"
        subtitle="Wrap two <code>[forDropList]</code> columns in <code>[forDropListGroup]</code> and they connect automatically. The <code>(dragDrop)</code> event fires on the source list with <code>previousContainer</code> / <code>container</code> contexts; compare them to choose <code>moveItemInArray</code> (same list) or <code>transferArrayItem</code> (across lists)."
        sourcePath="drag-drop/examples/transfer.example.ts"
      >
        <app-drag-drop-transfer-example />
      </playground-demo>

      <playground-demo
        title="Axis lock, boundary & custom preview"
        subtitle="A horizontal palette where <code>lockAxis='x'</code> pins the preview to its lift-time vertical position and <code>[boundary]</code> clamps it inside the dashed frame. A custom <code>[forDragPreview]</code> template replaces the default clone, and <code>[forDragPlaceholder]</code> fills the source slot. Both constraints affect only the pointer preview — never the resolved drop index."
        sourcePath="drag-drop/examples/constraints.example.ts"
      >
        <app-drag-drop-constraints-example />
      </playground-demo>

      <playground-demo
        title="Wrapping grid (mixed orientation)"
        subtitle="A flex-wrap grid of uniformly-sized tiles with <code>orientation='mixed'</code>. The drop index is resolved in 2D, so a tile dragged across a wrapped row lands in the slot under the pointer's row and column instead of mis-resolving to the nearest single-axis slot."
        sourcePath="drag-drop/examples/mixed-grid.example.ts"
      >
        <app-drag-drop-mixed-grid-example />
      </playground-demo>

      <playground-demo
        title="Free drag (forFreeDrag)"
        subtitle="<code>[forFreeDrag]</code> repositions its host (or a resolved <code>rootElement</code>) by pointer drag via a CSS transform — no <code>[forDropList]</code>, no reorder. The blue card moves itself within the dashed <code>boundary</code>; the panel is dragged by its header via <code>rootElement</code> so a child handle moves the whole ancestor. Pointer-only by design."
        sourcePath="drag-drop/examples/free-drag.example.ts"
      >
        <app-drag-drop-free-drag-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DragDropPage {
  protected readonly readme = readmeContent;
}
