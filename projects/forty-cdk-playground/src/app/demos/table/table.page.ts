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
import readmeContent from '../../../../../forty-cdk/table/README.md';

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
    <primitive-page slug="table" [readme]="readme">
      <playground-demo
        title="Grid mode & keyboard navigation"
        subtitle="mode='grid' turns a <div> CSS-grid into a single-tab-stop roving group with 2D arrow-key navigation. Home / End jump to the row edges, Ctrl+Home / Ctrl+End to the grid corners, and disabled cells are skipped. The header row sticks while the body scrolls."
        sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/grid.example.ts"
      >
        <app-table-grid-example />
      </playground-demo>

      <playground-demo
        title="Row selection"
        subtitle="selectionMode='multiple' adds row selection. The row owns aria-selected; [forTableRowSelector] is a decorative per-row affordance and [forTableSelectAll] is a tri-state header checkbox. Click a row, the selector, or press Space on a focused cell."
        sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/selection.example.ts"
      >
        <app-table-selection-example />
      </playground-demo>

      <playground-demo
        title="Sortable headers"
        subtitle="A native <table> in the default table mode. [forTableSortHeader] emits aria-sort and fires (sortChange) on click, Enter or Space — it never sorts the data itself. The consumer holds a single sort descriptor, derives each header's direction from it and reorders its own rows."
        sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/sorting.example.ts"
      >
        <app-table-sorting-example />
      </playground-demo>

      <playground-demo
        title="Column resizing"
        subtitle="[forTableColumnResizer] turns a focusable element inside a header cell into a resize handle. It publishes the resolved width as --for-table-col-<name>-width on the table root; the consumer wires that variable into grid-template-columns. Drag the handle, or focus it and press ArrowLeft / ArrowRight to step by 10px."
        sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/resizing.example.ts"
      >
        <app-table-resizing-example />
      </playground-demo>

      <playground-demo
        title="Column & row reordering"
        subtitle="The companion directives [forTableColumnReorder] (on the header row) and [forTableRowReorder] (on the rowgroup) wrap the drag-drop primitive. Add [forDraggable] [dragData] to each header cell / row, then drag to reorder. aria-rowindex / aria-colindex recompute automatically. The library never mutates your data — the handlers apply the move to local signals."
        sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/reordering.example.ts"
      >
        <app-table-reordering-example />
      </playground-demo>

      <playground-demo
        title="Virtualized rows (10,000)"
        subtitle="[forTableVirtualized] sits on the same element as [forTable] in <div> grid mode. Set [rowCount] to the true total — it drives both aria-rowcount and the window size. Each [forTableRow] gets [virtualIndex] and a translateY transform. Roving 2D keyboard navigation works across the full 10,000 rows, scrolling out-of-window cells into view on demand."
        sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/virtualized.example.ts"
      >
        <app-table-virtualized-example />
      </playground-demo>

      <playground-demo
        title="Infinite scroll"
        subtitle="The headless injectInfiniteScroll core composes on top of [forTableVirtualized]: derive a [first, last+1) range from virtualRows() and feed it the loaded count. The detector fires once per threshold crossing, suppresses re-fire while the load promise is pending and re-arms when [rowCount] grows after each appended page — up to a cap."
        sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/infinite-scroll.example.ts"
      >
        <app-table-infinite-scroll-example />
      </playground-demo>

      <playground-demo
        title="Everything at once"
        subtitle="One grid-mode table composing six features on the same element: multiple row selection with a tri-state select-all, sortable headers, column resizing, column reordering, virtualization and infinite scroll. [selectableValues] feeds select-all the full loaded dataset so its tri-state stays correct beyond the rendered window."
        sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/combined.example.ts"
      >
        <app-table-combined-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TablePage {
  protected readonly readme = readmeContent;
}
