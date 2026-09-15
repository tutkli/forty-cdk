import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { TableCombinedExample } from './examples/combined.example';
import { TableGridExample } from './examples/grid.example';
import { TableInfiniteScrollExample } from './examples/infinite-scroll.example';
import { TableReorderingExample } from './examples/reordering.example';
import { TableResizingExample } from './examples/resizing.example';
import { TableSelectionExample } from './examples/selection.example';
import { TableSortingExample } from './examples/sorting.example';
import { TableVirtualizedExample } from './examples/virtualized.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/table.generated';

@Component({
  selector: 'app-table-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    TableGridExample,
    TableSelectionExample,
    TableSortingExample,
    TableResizingExample,
    TableReorderingExample,
    TableVirtualizedExample,
    TableInfiniteScrollExample,
    TableCombinedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="table" [doc]="doc">
      <demo-layout hero sourcePath="table/examples/grid.example.ts">
        <app-table-grid-example />
      </demo-layout>

      <demo-layout heading="row-selection" sourcePath="table/examples/selection.example.ts">
        <app-table-selection-example />
      </demo-layout>

      <demo-layout heading="sortable-headers" sourcePath="table/examples/sorting.example.ts">
        <app-table-sorting-example />
      </demo-layout>

      <demo-layout heading="column-resizing" sourcePath="table/examples/resizing.example.ts">
        <app-table-resizing-example />
      </demo-layout>

      <demo-layout
        heading="column--row-reordering"
        sourcePath="table/examples/reordering.example.ts"
      >
        <app-table-reordering-example />
      </demo-layout>

      <demo-layout
        heading="virtualized-rows-10000"
        sourcePath="table/examples/virtualized.example.ts"
      >
        <app-table-virtualized-example />
      </demo-layout>

      <demo-layout heading="infinite-scroll" sourcePath="table/examples/infinite-scroll.example.ts">
        <app-table-infinite-scroll-example />
      </demo-layout>

      <demo-layout heading="everything-at-once" sourcePath="table/examples/combined.example.ts">
        <app-table-combined-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class TablePage {
  protected readonly doc = DOC;
}
