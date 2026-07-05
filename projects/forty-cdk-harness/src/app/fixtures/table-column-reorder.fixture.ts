import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ForDraggable } from 'forty-cdk/drag-drop';
import {
  ForTable,
  ForTableCell,
  ForTableColumnReorder,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  type TableColumnReorderDescriptor,
} from 'forty-cdk/table';

interface Row {
  id: number;
  name: string;
  role: string;
  dept: string;
}

@Component({
  selector: 'app-table-column-reorder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableColumnReorder,
    ForDraggable,
  ],
  styles: `
    .header-row,
    .data-row {
      display: grid;
      grid-template-columns: repeat(3, 120px);
    }

    .header-cell {
      padding: 8px;
      font-weight: bold;
      border: 1px solid #ccc;
      cursor: grab;
    }

    .data-cell {
      padding: 8px;
      border: 1px solid #eee;
    }
  `,
  template: `
    <button data-testid="before">Before</button>

    <div forTable mode="grid" aria-label="Column reorder grid" data-testid="table-root">
      <div
        forTableHeaderRow
        forTableColumnReorder
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
          </div>
        }
      </div>
      <div role="rowgroup">
        @for (row of rows(); track row.id; let r = $index) {
          <div forTableRow [value]="row.id" class="data-row" [attr.data-testid]="'row-' + r">
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
          </div>
        }
      </div>
    </div>

    <button data-testid="after">After</button>
  `,
})
export class TableColumnReorderFixture {
  readonly columns = signal<readonly string[]>(['name', 'role', 'dept']);
  readonly rows = signal<Row[]>([
    { id: 0, name: 'Ada', role: 'Engineer', dept: 'Platform' },
    { id: 1, name: 'Bob', role: 'Designer', dept: 'Product' },
    { id: 2, name: 'Carol', role: 'Manager', dept: 'Leadership' },
  ]);

  onColumnReorder(d: TableColumnReorderDescriptor): void {
    this.columns.set(d.columns);
  }

  cellValue(row: Row, col: string): string {
    return String((row as unknown as Record<string, unknown>)[col] ?? '');
  }
}
