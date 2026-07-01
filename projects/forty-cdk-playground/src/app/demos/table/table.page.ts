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
      <playground-demo hero sourcePath="table/examples/grid.example.ts">
        <app-table-grid-example />
      </playground-demo>

      <playground-demo
        title="Row selection"
        subtitle='<code>selectionMode="multiple"</code> adds row selection. The row owns <code>aria-selected</code>; <code>[forTableRowSelector]</code> is a decorative per-row affordance and <code>[forTableSelectAll]</code> is a tri-state header checkbox. Click a row, the selector, or press <kbd>Space</kbd> on a focused cell.'
        sourcePath="table/examples/selection.example.ts"
      >
        <app-table-selection-example />
      </playground-demo>

      <playground-demo
        title="Sortable headers"
        subtitle="A native <code>&lt;table&gt;</code> in the default <code>table</code> mode. <code>[forTableSortHeader]</code> emits <code>aria-sort</code> and fires <code>(sortChange)</code> on click, <kbd>Enter</kbd> or <kbd>Space</kbd> — it never sorts the data itself. The consumer holds a single sort descriptor, derives each header's direction from it and reorders its own rows."
        sourcePath="table/examples/sorting.example.ts"
      >
        <app-table-sorting-example />
      </playground-demo>

      <playground-demo
        title="Column resizing"
        subtitle="<code>[forTableColumnResizer]</code> turns a focusable element inside a header cell into a resize handle. It publishes the resolved width as <code>--for-table-col-&lt;name&gt;-width</code> on the table root; the consumer wires that variable into <code>grid-template-columns</code>. Drag the handle, or focus it and press <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> to step by 10px."
        sourcePath="table/examples/resizing.example.ts"
      >
        <app-table-resizing-example />
      </playground-demo>

      <playground-demo
        title="Column & row reordering"
        subtitle="The companion directives <code>[forTableColumnReorder]</code> (on the header row) and <code>[forTableRowReorder]</code> (on the rowgroup) wrap the drag-drop primitive. Add <code>[forDraggable]</code> <code>[dragData]</code> to each header cell / row, then drag to reorder. <code>aria-rowindex</code> / <code>aria-colindex</code> recompute automatically. The library never mutates your data — the handlers apply the move to local signals."
        sourcePath="table/examples/reordering.example.ts"
      >
        <app-table-reordering-example />
      </playground-demo>

      <playground-demo
        title="Virtualized rows (10,000)"
        subtitle="<code>[forTableVirtualized]</code> sits on the same element as <code>[forTable]</code> in <code>&lt;div&gt;</code> grid mode. Set <code>[rowCount]</code> to the true total — it drives both <code>aria-rowcount</code> and the window size. Each <code>[forTableRow]</code> gets <code>[virtualIndex]</code> and a <code>translateY</code> transform. Roving 2D keyboard navigation works across the full 10,000 rows, scrolling out-of-window cells into view on demand."
        sourcePath="table/examples/virtualized.example.ts"
      >
        <app-table-virtualized-example />
      </playground-demo>

      <playground-demo
        title="Infinite scroll"
        subtitle="The headless <code>injectInfiniteScroll</code> core composes on top of <code>[forTableVirtualized]</code>: derive a [first, last+1) range from <code>virtualRows()</code> and feed it the loaded count. The detector fires once per threshold crossing, suppresses re-fire while the load promise is pending and re-arms when <code>[rowCount]</code> grows after each appended page — up to a cap."
        sourcePath="table/examples/infinite-scroll.example.ts"
      >
        <app-table-infinite-scroll-example />
      </playground-demo>

      <playground-demo
        title="Everything at once"
        subtitle="One grid-mode table composing six features on the same element: multiple row selection with a tri-state select-all, sortable headers, column resizing, column reordering, virtualization and infinite scroll. <code>[selectableValues]</code> feeds select-all the full loaded dataset so its tri-state stays correct beyond the rendered window."
        sourcePath="table/examples/combined.example.ts"
      >
        <app-table-combined-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class TablePage {
  protected readonly readme = readmeContent;
}
