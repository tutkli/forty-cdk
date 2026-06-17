import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { TableGridExample } from './examples/grid.example';
import { TableReorderingExample } from './examples/reordering.example';
import { TableResizingExample } from './examples/resizing.example';
import { TableSelectionExample } from './examples/selection.example';
import { TableSortingExample } from './examples/sorting.example';

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
  ],
  template: `
    <primitive-page slug="table">
      <app-table-grid-example />
      <app-table-selection-example />
      <app-table-sorting-example />
      <app-table-resizing-example />
      <app-table-reordering-example />
    </primitive-page>
  `,
})
export class TablePage {}
