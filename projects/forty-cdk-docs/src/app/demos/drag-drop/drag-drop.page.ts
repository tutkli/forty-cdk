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
import { DOC } from '../../../generated/docs/primitives/drag-drop.generated';

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
    <primitive-page slug="drag-drop" [doc]="doc">
      <demo-layout hero sourcePath="drag-drop/examples/sortable.example.ts">
        <app-drag-drop-sortable-example />
      </demo-layout>

      <demo-layout
        heading="drag-follows-scroll-auto-scroll"
        sourcePath="drag-drop/examples/auto-scroll.example.ts"
      >
        <app-drag-drop-auto-scroll-example />
      </demo-layout>

      <demo-layout
        heading="transfer-between-lists"
        sourcePath="drag-drop/examples/transfer.example.ts"
      >
        <app-drag-drop-transfer-example />
      </demo-layout>

      <demo-layout
        heading="axis-lock-boundary--custom-preview"
        sourcePath="drag-drop/examples/constraints.example.ts"
      >
        <app-drag-drop-constraints-example />
      </demo-layout>

      <demo-layout
        heading="wrapping-grid-mixed-orientation"
        sourcePath="drag-drop/examples/mixed-grid.example.ts"
      >
        <app-drag-drop-mixed-grid-example />
      </demo-layout>

      <demo-layout
        heading="free-drag-forfreedrag"
        sourcePath="drag-drop/examples/free-drag.example.ts"
      >
        <app-drag-drop-free-drag-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class DragDropPage {
  protected readonly doc = DOC;
}
