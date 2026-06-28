import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { DragDropAutoScrollExample } from './examples/auto-scroll.example';
import { DragDropConstraintsExample } from './examples/constraints.example';
import { DragDropFreeDragExample } from './examples/free-drag.example';
import { DragDropMixedGridExample } from './examples/mixed-grid.example';
import { DragDropSortableExample } from './examples/sortable.example';
import { DragDropTransferExample } from './examples/transfer.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/drag-drop/README.md';

@Component({
  selector: 'app-drag-drop-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
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
      <app-drag-drop-sortable-example />
      <app-drag-drop-auto-scroll-example />
      <app-drag-drop-transfer-example />
      <app-drag-drop-constraints-example />
      <app-drag-drop-mixed-grid-example />
      <app-drag-drop-free-drag-example />
    </primitive-page>
  `,
})
export class DragDropPage {
  protected readonly readme = readmeContent;
}
