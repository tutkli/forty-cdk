import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TableCombinedExample } from './examples/combined.example';
import { TableGridExample } from './examples/grid.example';
import { TableInfiniteScrollExample } from './examples/infinite-scroll.example';
import { TableReorderingExample } from './examples/reordering.example';
import { TableResizingExample } from './examples/resizing.example';
import { TableSelectionExample } from './examples/selection.example';
import { TableSortingExample } from './examples/sorting.example';
import { TableVirtualizedExample } from './examples/virtualized.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/table/README.md';

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
    TableCombinedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="table" [readme]="readme">
      <app-table-grid-example />
      <app-table-selection-example />
      <app-table-sorting-example />
      <app-table-resizing-example />
      <app-table-reordering-example />
      <app-table-virtualized-example />
      <app-table-infinite-scroll-example />
      <app-table-combined-example />
    </primitive-page>
  `,
})
export class TablePage {
  protected readonly readme = readmeContent;
}
