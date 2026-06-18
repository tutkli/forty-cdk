import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import {
  ForDraggable,
  ForDragPlaceholder,
  ForTable,
  ForTableCell,
  ForTableColumnReorder,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowReorder,
  moveItemInArray,
  type TableColumnReorderDescriptor,
  type TableRowReorderDescriptor,
} from 'forty-cdk';

interface Row {
  id: number;
  name: string;
  role: string;
  dept: string;
}

@Component({
  selector: 'app-table-reorder',
  standalone: true,
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableColumnReorder,
    ForTableRowReorder,
    ForDraggable,
    ForDragPlaceholder,
  ],
  styles: `
    .table-root {
      display: grid;
      grid-template-rows: auto 1fr;
    }

    .header-row {
      display: grid;
      grid-template-columns: repeat(3, 120px);
    }

    .header-cell {
      padding: 8px;
      font-weight: bold;
      border: 1px solid #ccc;
      cursor: grab;
    }

    .data-row {
      display: grid;
      grid-template-columns: repeat(3, 120px);
    }

    .data-cell {
      padding: 8px;
      border: 1px solid #eee;
    }

    .col-ph {
      height: 100%;
      min-height: 2rem;
      border: 2px dashed #4a90e2;
      box-sizing: border-box;
    }

    .row-ph {
      width: 100%;
      height: 2.5rem;
      border: 2px dashed #4a90e2;
      box-sizing: border-box;
    }
  `,
  template: `
    <button data-testid="before">Before</button>

    <div forTable mode="grid" class="table-root" aria-label="Reorder demo">
      <div
        forTableHeaderRow
        forTableColumnReorder
        orientation="horizontal"
        [liveSort]="liveSort"
        class="header-row"
        data-testid="header-row"
        (columnReorder)="onColumnReorder($event)"
      >
        @for (col of columns(); track col) {
          <div
            forTableHeaderCell
            [name]="col"
            forDraggable
            [dragData]="col"
            class="header-cell"
            [attr.data-testid]="'header-' + col"
          >
            {{ col }}
            <ng-template forDragPlaceholder>
              <div class="col-ph" data-testid="col-placeholder"></div>
            </ng-template>
          </div>
        }
      </div>
      <div
        role="rowgroup"
        forTableRowReorder
        [liveSort]="liveSort"
        data-testid="rowgroup"
        (rowReorder)="onRowReorder($event)"
      >
        @for (row of rows(); track row.id; let r = $index) {
          <div
            forTableRow
            [value]="row.id"
            forDraggable
            [dragData]="row.id"
            class="data-row"
            [attr.data-testid]="'row-' + r"
          >
            @for (col of columns(); track col) {
              <div
                forTableCell
                [name]="col"
                class="data-cell"
                [attr.data-testid]="'cell-' + r + '-' + col"
              >
                {{ cellValue(row, col) }}
              </div>
            }
            <ng-template forDragPlaceholder>
              <div class="row-ph" data-testid="row-placeholder"></div>
            </ng-template>
          </div>
        }
      </div>
    </div>

    <button data-testid="after">After</button>
  `,
})
export class TableReorderFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly liveSort = this.#route.snapshot.queryParamMap.get('liveSort') === 'true';

  readonly columns = signal<readonly string[]>(['name', 'role', 'dept']);
  readonly rows = signal<Row[]>([
    { id: 0, name: 'Ada', role: 'Engineer', dept: 'Platform' },
    { id: 1, name: 'Bob', role: 'Designer', dept: 'Product' },
    { id: 2, name: 'Carol', role: 'Manager', dept: 'Leadership' },
  ]);

  onRowReorder(d: TableRowReorderDescriptor): void {
    this.rows.update((r) => moveItemInArray(r, d.from, d.to));
  }

  onColumnReorder(d: TableColumnReorderDescriptor): void {
    this.columns.set(d.columns);
  }

  cellValue(row: Row, col: string): string {
    return String((row as unknown as Record<string, unknown>)[col] ?? '');
  }
}
