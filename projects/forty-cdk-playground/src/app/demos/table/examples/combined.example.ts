import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import {
  ForDraggable,
  ForDragPlaceholder,
  ForTable,
  ForTableCell,
  ForTableColumnReorder,
  ForTableColumnResizer,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowSelector,
  ForTableSelectAll,
  ForTableSortHeader,
  type TableColumnReorderDescriptor,
  type TableSortDescriptor,
  type TableSortDirection,
} from 'forty-cdk';
import { ForTableVirtualized, injectInfiniteScroll } from 'forty-cdk/virtualization';

import { DemoLayout } from '../../../ui/demo-layout';
import { makePeople } from './big-people';
import { COLUMN_LABELS, type Person, type PersonColumn, personField } from './people';

const ROW_HEIGHT = 40;
const PAGE = 50;
const MAX = 600;
const LATENCY = 500;

const FALLBACK_WIDTH: Record<PersonColumn, number> = {
  name: 200,
  role: 140,
  dept: 160,
  location: 140,
};

@Component({
  selector: 'app-table-combined-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTable,
    ForTableVirtualized,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableRowSelector,
    ForTableSelectAll,
    ForTableSortHeader,
    ForTableColumnResizer,
    ForTableColumnReorder,
    ForDraggable,
    ForDragPlaceholder,
  ],
  template: `
    <playground-demo
      title="Everything at once"
      subtitle="One grid-mode table composing six features on the same element: multiple row selection with a tri-state select-all, sortable headers, column resizing, column reordering, virtualization (rows windowed) and infinite scroll. [selectableValues] feeds select-all the full loaded dataset so its tri-state stays correct beyond the rendered window. Each header cell is simultaneously a sort header, a drag handle for reordering and the host of a resize handle — they coexist without stealing each other's pointer or focus."
      sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/combined.example.ts"
    >
      <div demo class="ctbl-demo">
        <div
          forTable
          forTableVirtualized
          #v="forTableVirtualized"
          mode="grid"
          ariaLabel="People"
          class="ctbl"
          [rowCount]="displayRows().length"
          [estimateRowSize]="rowHeight"
          [selectionMode]="'multiple'"
          [(selection)]="selection"
          [selectableValues]="allIds()"
        >
          <div
            forTableHeaderRow
            forTableColumnReorder
            orientation="horizontal"
            [liveSort]="true"
            class="ctbl-row ctbl-head"
            [style.gridTemplateColumns]="gridCols()"
            (columnReorder)="onColumnReorder($event)"
          >
            <div forTableHeaderCell name="sel" class="ctbl-cell ctbl-sel">
              <span forTableSelectAll ariaLabel="Select all rows" class="ctbl-check"></span>
            </div>
            @for (column of columns(); track column) {
              <div
                forTableHeaderCell
                [name]="column"
                class="ctbl-cell ctbl-head-cell"
                forTableSortHeader
                [column]="column"
                [direction]="directionFor(column)"
                forDraggable
                [dragData]="column"
                (sortChange)="onSort($event)"
              >
                <span class="ctbl-grip" aria-hidden="true">⠿</span>
                <span class="ctbl-sort-label">{{ labels[column] }}</span>
                <button
                  forTableColumnResizer
                  [column]="column"
                  [min]="90"
                  [max]="360"
                  class="ctbl-resizer"
                  [attr.aria-label]="'Resize ' + labels[column] + ' column'"
                ></button>
                <ng-template forDragPlaceholder>
                  <div class="ctbl-ph"></div>
                </ng-template>
              </div>
            }
          </div>
          <div role="rowgroup" class="ctbl-body" [style.height.px]="v.totalSize()">
            @for (vrow of v.virtualRows(); track vrow.index) {
              <div
                forTableRow
                [value]="displayRows()[vrow.index]!.id"
                [virtualIndex]="vrow.index"
                class="ctbl-row ctbl-data-row"
                [style.gridTemplateColumns]="gridCols()"
                [style.transform]="'translateY(' + vrow.start + 'px)'"
              >
                <div forTableCell name="sel" class="ctbl-cell ctbl-sel">
                  <span forTableRowSelector class="ctbl-check"></span>
                </div>
                @for (column of columns(); track column) {
                  <div forTableCell [name]="column" class="ctbl-cell">
                    {{ field(displayRows()[vrow.index]!, column) }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <button type="button" class="pg-btn" (click)="reset()">Reset</button>
        <p class="pg-hint">
          Drag a header sideways to reorder columns, drag its right edge to resize, click it to
          sort. Tick rows or the header checkbox to select; the body virtualizes and fetches more
          rows as you scroll toward the end.
        </p>
        <p class="pg-state">
          columns: <b>{{ columns().join(', ') }}</b
          ><br />
          sort: <b>{{ sort().column || '—' }} {{ sort().direction }}</b
          ><br />
          selected: <b>{{ selection().length }}</b
          ><br />
          loaded: <b>{{ rows().length }}</b> / {{ max }} ({{ statusLabel() }})
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .ctbl-demo {
      width: min(680px, 100%);
    }

    .ctbl {
      width: 100%;
      height: 400px;
      overflow: auto;
      position: relative;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      font-size: 0.88rem;
    }

    .ctbl-row {
      display: grid;
      align-items: center;
    }

    .ctbl-head {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--pg-surface-2);
      font-weight: 700;
    }

    .ctbl-body {
      position: relative;
    }

    .ctbl-data-row {
      position: absolute;
      left: 0;
      right: 0;
    }

    .ctbl-data-row[data-selected] {
      background: color-mix(in srgb, var(--pg-primary) 12%, transparent);
    }

    .ctbl-cell {
      position: relative;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--pg-border);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      outline: none;
    }

    .ctbl-head .ctbl-cell {
      border-bottom: 2px solid var(--pg-border-strong);
    }

    .ctbl-cell[data-highlighted],
    .ctbl-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }

    .ctbl-sel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-inline: 0.4rem;
    }

    .ctbl-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.05rem;
      height: 1.05rem;
      border: 1.5px solid var(--pg-border-strong);
      border-radius: 5px;
      background: var(--pg-surface);
      cursor: pointer;
    }

    .ctbl-check[data-state='checked'],
    .ctbl-check[data-state='indeterminate'] {
      border-color: var(--pg-primary);
      background: var(--pg-primary);
    }

    .ctbl-check[data-state='checked']::after {
      content: '✓';
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--pg-primary-contrast);
      line-height: 1;
    }

    .ctbl-check[data-state='indeterminate']::after {
      content: '';
      width: 0.6rem;
      height: 2px;
      border-radius: 1px;
      background: var(--pg-primary-contrast);
    }

    .ctbl-head-cell {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      cursor: grab;
      user-select: none;
    }

    .ctbl-head-cell:active {
      cursor: grabbing;
    }

    .ctbl-sort-label::after {
      content: ' ↕';
      font-size: 0.8em;
      opacity: 0.35;
    }

    .ctbl-head-cell[data-sorted='ascending'] .ctbl-sort-label::after {
      content: ' ▲';
      opacity: 1;
      color: var(--pg-primary);
    }

    .ctbl-head-cell[data-sorted='descending'] .ctbl-sort-label::after {
      content: ' ▼';
      opacity: 1;
      color: var(--pg-primary);
    }

    .ctbl-grip {
      color: var(--pg-text-muted);
      font-size: 0.85rem;
      line-height: 1;
    }

    .ctbl-cell[data-dragging] {
      opacity: 0.4;
    }

    .ctbl-resizer {
      position: absolute;
      top: 0;
      right: 0;
      width: 9px;
      height: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: col-resize;
      touch-action: none;
    }

    .ctbl-resizer::before {
      content: '';
      position: absolute;
      top: 20%;
      right: 3px;
      width: 2px;
      height: 60%;
      border-radius: 1px;
      background: var(--pg-border-strong);
    }

    .ctbl-resizer:hover::before,
    .ctbl-resizer[data-resizing]::before {
      background: var(--pg-primary);
    }

    .ctbl-ph {
      width: 100%;
      height: 100%;
      min-height: 2rem;
      box-sizing: border-box;
      border: 2px dashed var(--pg-primary);
      border-radius: var(--pg-radius-sm);
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }
  `,
})
export class TableCombinedExample {
  protected readonly rowHeight = ROW_HEIGHT;
  protected readonly max = MAX;
  protected readonly labels = COLUMN_LABELS;

  protected readonly selection = signal<readonly unknown[]>([]);
  protected readonly columns = signal<readonly PersonColumn[]>([
    'name',
    'role',
    'dept',
    'location',
  ]);
  protected readonly sort = signal<TableSortDescriptor>({ column: '', direction: 'none' });

  protected readonly rows = signal<readonly Person[]>(makePeople(0, 150));

  protected readonly displayRows = computed<readonly Person[]>(() => {
    const { column, direction } = this.sort();
    const base = this.rows();
    if (!column || direction === 'none') {
      return base;
    }
    const key = column as PersonColumn;
    const sorted = [...base].sort((a, b) => personField(a, key).localeCompare(personField(b, key)));
    return direction === 'descending' ? sorted.reverse() : sorted;
  });

  protected readonly allIds = computed<readonly number[]>(() =>
    this.displayRows().map((person) => person.id),
  );

  protected readonly gridCols = computed(
    () =>
      '40px ' +
      this.columns()
        .map((c) => `var(--for-table-col-${c}-width, ${FALLBACK_WIDTH[c]}px)`)
        .join(' '),
  );

  private readonly tableV = viewChild<ForTableVirtualized>('v');
  private readonly range = computed<readonly [number, number]>(() => {
    const visible = this.tableV()?.virtualRows() ?? [];
    if (visible.length === 0) {
      return [0, 0];
    }
    return [visible[0]!.index, visible[visible.length - 1]!.index + 1];
  });

  protected readonly loader = injectInfiniteScroll({
    range: this.range,
    count: computed(() => this.rows().length),
    threshold: 8,
    disabled: computed(() => this.rows().length >= MAX),
    onLoadMore: () => this.loadMore(),
  });

  protected readonly statusLabel = computed(() => {
    if (this.rows().length >= MAX) {
      return 'all loaded';
    }
    return this.loader.pending() ? 'loading…' : 'idle';
  });

  protected directionFor(column: PersonColumn): TableSortDirection {
    return this.sort().column === column ? this.sort().direction : 'none';
  }

  protected onSort(descriptor: TableSortDescriptor): void {
    this.sort.set(descriptor);
  }

  protected onColumnReorder(descriptor: TableColumnReorderDescriptor): void {
    this.columns.set(descriptor.columns as readonly PersonColumn[]);
  }

  protected field(person: Person, column: PersonColumn): string {
    return personField(person, column);
  }

  protected reset(): void {
    this.selection.set([]);
    this.columns.set(['name', 'role', 'dept', 'location']);
    this.sort.set({ column: '', direction: 'none' });
    this.rows.set(makePeople(0, 150));
  }

  private loadMore(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.rows.update((current) => [
          ...current,
          ...makePeople(current.length, Math.min(PAGE, MAX - current.length)),
        ]);
        resolve();
      }, LATENCY);
    });
  }
}
