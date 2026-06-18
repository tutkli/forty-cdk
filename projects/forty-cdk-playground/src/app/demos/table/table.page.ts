import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TableGridExample } from './examples/grid.example';
import { TableInfiniteScrollExample } from './examples/infinite-scroll.example';
import { TableReorderingExample } from './examples/reordering.example';
import { TableResizingExample } from './examples/resizing.example';
import { TableSelectionExample } from './examples/selection.example';
import { TableSortingExample } from './examples/sorting.example';
import { TableVirtualizedExample } from './examples/virtualized.example';

@Component({
  selector: 'app-table-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    TableGridExample,
    TableSelectionExample,
    TableSortingExample,
    TableResizingExample,
    TableReorderingExample,
    TableVirtualizedExample,
    TableInfiniteScrollExample,
  ],
  template: `
    <primitive-page slug="table">
      <app-table-grid-example />
      <app-table-selection-example />
      <app-table-sorting-example />
      <app-table-resizing-example />
      <app-table-reordering-example />
      <app-table-virtualized-example />
      <app-table-infinite-scroll-example />
    </primitive-page>
  `,
})
export class TablePage {}
