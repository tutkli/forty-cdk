import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  ForTable,
  ForTableBody,
  ForTableCellDef,
  ForTableColumnDef,
  ForTableColumnDragPlaceholder,
  ForTableHeaderCellDef,
  type TableColumnReorderDescriptor,
  type TableSortDescriptor,
} from 'forty-cdk/table';

interface Row {
  id: number;
  name: string;
  role: string;
  dept: string;
}

@Component({
  selector: 'app-for-table-body-reorder-fixture',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableBody,
    ForTableColumnDef,
    ForTableHeaderCellDef,
    ForTableCellDef,
    ForTableColumnDragPlaceholder,
  ],
  styles: `
    :host {
      display: block;
      padding: 24px;
    }
    [forTableHeaderCell],
    [forTableCell] {
      padding: 8px;
      border: 1px solid #ddd;
    }
    [forTableHeaderCell][forDraggable] {
      cursor: grab;
      font-weight: bold;
    }
    .col-ghost {
      background: #cde;
      border: 1px dashed #369;
    }
  `,
  template: `
    <button data-testid="before">Before</button>

    <div forTable mode="grid" ariaLabel="Reorderable people" data-testid="root">
      <for-table-body
        [rows]="rows()"
        [rowKey]="rowKey"
        [displayedColumns]="order()"
        [sort]="sort()"
        (sortChange)="sort.set($event)"
        (columnReorder)="onReorder($event)"
      >
        <ng-container forTableColumnDef="name" width="140px" sortable reorderable>
          <ng-template forTableHeaderCellDef>Name</ng-template>
          <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
            row.name
          }}</ng-template>
        </ng-container>

        <ng-container forTableColumnDef="role" width="140px" reorderable>
          <ng-template forTableHeaderCellDef>Role</ng-template>
          <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
            row.role
          }}</ng-template>
        </ng-container>

        <ng-container forTableColumnDef="dept" width="140px" reorderable>
          <ng-template forTableHeaderCellDef>Dept</ng-template>
          <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{
            row.dept
          }}</ng-template>
        </ng-container>

        <ng-template forTableColumnDragPlaceholder>
          <div class="col-ghost" data-testid="col-ghost"></div>
        </ng-template>
      </for-table-body>
    </div>

    <button data-testid="after">After</button>
  `,
})
export class ForTableBodyReorderFixture {
  readonly rows = signal<Row[]>([
    { id: 0, name: 'Ada', role: 'Engineer', dept: 'Platform' },
    { id: 1, name: 'Bob', role: 'Designer', dept: 'Product' },
    { id: 2, name: 'Carol', role: 'Manager', dept: 'Leadership' },
  ]);
  readonly order = signal<readonly string[]>(['name', 'role', 'dept']);
  readonly sort = signal<TableSortDescriptor | null>(null);
  readonly rowKey = (row: Row): number => row.id;

  onReorder(descriptor: TableColumnReorderDescriptor): void {
    this.order.set(descriptor.columns);
  }
}
