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
      <playground-demo
        title="Sortable list"
        subtitle="A vertical [forDropList] of [forDraggable] items, reorderable by pointer and keyboard. Pointer drags start from the [forDragHandle] grip; the source slot dims via data-dragging. liveSort makes the [forDragPlaceholder] follow the live drop index, and animateReorder adds FLIP + drop-settle transitions."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/sortable.example.ts"
      >
        <app-drag-drop-sortable-example />
      </playground-demo>

      <playground-demo
        title="Drag follows scroll (auto-scroll)"
        subtitle="When a pointer drag reaches the edge of the nearest scrollable container, [forDropList] auto-scrolls it toward that edge so you can drop on items far outside the visible window. The edge zone and max speed are tuned via provideForDragDropDefaults. Keyboard dragging is unaffected."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/auto-scroll.example.ts"
      >
        <app-drag-drop-auto-scroll-example />
      </playground-demo>

      <playground-demo
        title="Transfer between lists"
        subtitle="Wrap two [forDropList] columns in [forDropListGroup] and they connect automatically. The (dragDrop) event fires on the source list with previousContainer / container contexts; compare them to choose moveItemInArray (same list) or transferArrayItem (across lists)."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/transfer.example.ts"
      >
        <app-drag-drop-transfer-example />
      </playground-demo>

      <playground-demo
        title="Axis lock, boundary & custom preview"
        subtitle="A horizontal palette where lockAxis='x' pins the preview to its lift-time vertical position and [boundary] clamps it inside the dashed frame. A custom [forDragPreview] template replaces the default clone, and [forDragPlaceholder] fills the source slot. Both constraints affect only the pointer preview — never the resolved drop index."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/constraints.example.ts"
      >
        <app-drag-drop-constraints-example />
      </playground-demo>

      <playground-demo
        title="Wrapping grid (mixed orientation)"
        subtitle="A flex-wrap grid of uniformly-sized tiles with orientation='mixed'. The drop index is resolved in 2D, so a tile dragged across a wrapped row lands in the slot under the pointer's row and column instead of mis-resolving to the nearest single-axis slot."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/mixed-grid.example.ts"
      >
        <app-drag-drop-mixed-grid-example />
      </playground-demo>

      <playground-demo
        title="Free drag (forFreeDrag)"
        subtitle="[forFreeDrag] repositions its host (or a resolved rootElement) by pointer drag via a CSS transform — no [forDropList], no reorder. The blue card moves itself within the dashed boundary; the panel is dragged by its header via rootElement so a child handle moves the whole ancestor. Pointer-only by design."
        sourcePath="projects/forty-cdk-playground/src/app/demos/drag-drop/examples/free-drag.example.ts"
      >
        <app-drag-drop-free-drag-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DragDropPage {
  protected readonly readme = readmeContent;
}
