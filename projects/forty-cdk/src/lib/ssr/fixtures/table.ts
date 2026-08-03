import { Component } from '@angular/core';
import { ForDraggable } from 'forty-cdk/drag-drop';
import {
  ForColumnDef,
  ForColumnDragPlaceholder,
  ForDataCell,
  ForHeaderCell,
  ForPlaceholderCell,
  ForPlaceholderCellDefault,
  ForRowCell,
  ForRowDef,
  ForTable,
  ForTableBody,
  ForTableCell,
  ForTableColumnLabel,
  ForTableColumnReorder,
  ForTableColumnResizer,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowReorder,
  ForTableSortHeader,
} from 'forty-cdk/table';
import { ForTableVirtualized } from 'forty-cdk/virtualization';

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableRow, ForTableHeaderCell, ForTableCell],
  template: `
    <table forTable aria-label="People">
      <thead>
        <tr forTableHeaderRow>
          <th forTableHeaderCell name="name" sticky>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr forTableRow>
          <td forTableCell name="name">Ada</td>
        </tr>
      </tbody>
    </table>
  `,
})
export class TableFixture {}

@Component({
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableSortHeader,
    ForTableColumnResizer,
    ForTableColumnLabel,
    ForTableColumnReorder,
    ForTableRowReorder,
    ForDraggable,
  ],
  template: `
    <div forTable mode="grid" aria-label="People" [rowCount]="100" selectionMode="multiple">
      <div forTableHeaderRow forTableColumnReorder orientation="horizontal">
        <div forTableHeaderCell name="name" forTableSortHeader column="name" direction="ascending">
          <span forTableColumnLabel>Name</span>
          <button
            forTableColumnResizer
            column="name"
            fitIncludesHeader
            aria-label="Resize name"
          ></button>
        </div>
        <div forTableHeaderCell name="role" forDraggable [dragData]="'role'">
          Role
          <button
            forTableColumnResizer
            column="role"
            [width]="120"
            aria-label="Resize role"
          ></button>
        </div>
      </div>
      <div role="rowgroup" forTableRowReorder>
        <div forTableRow [value]="1" forDraggable [dragData]="1">
          <div forTableCell name="name">Ada</div>
          <div forTableCell name="role">Engineer</div>
        </div>
      </div>
    </div>
  `,
})
export class TableGridFixture {}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="grid" aria-label="People">
      <for-table-body [rows]="rows" [rowKey]="rowKey">
        <ng-container forColumnDef="name" sticky>
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row.role }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
export class TableBodyFixture {
  readonly rows = [
    { id: 1, name: 'Ada', role: 'Engineer' },
    { id: 2, name: 'Grace', role: 'Engineer' },
  ];
  readonly rowKey = (row: { id: number }): number => row.id;
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForRowDef,
    ForRowCell,
  ],
  template: `
    <div forTable mode="grid" aria-label="Grouped">
      <for-table-body [rows]="rows" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row.role }}</ng-template>
        </ng-container>
        <ng-container forRowDef [when]="isGroup">
          <ng-template forRowCell [forRowCellRow]="rows" let-row>Group: {{ row.name }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
export class TableBodyRowVariantFixture {
  readonly rows = [
    { id: -1, name: 'Engineers', role: '', group: true },
    { id: 1, name: 'Ada', role: 'Engineer' },
    { id: 2, name: 'Grace', role: 'Engineer' },
  ];
  readonly rowKey = (row: { id: number }): number => row.id;
  readonly isGroup = (row: { group?: boolean }): boolean => row.group === true;
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForPlaceholderCell,
    ForPlaceholderCellDefault,
    ForRowDef,
  ],
  template: `
    <div forTable mode="grid" aria-label="Feed">
      <for-table-body [rows]="rows" [rowKey]="rowKey">
        <ng-template forPlaceholderCellDefault><span class="skeleton-default">…</span></ng-template>
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row.name }}</ng-template>
          <ng-template forPlaceholderCell><span class="skeleton">…</span></ng-template>
        </ng-container>
        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row.role }}</ng-template>
        </ng-container>
        <ng-container forRowDef [when]="isPending" placeholderCells />
      </for-table-body>
    </div>
  `,
})
export class TableBodyPlaceholderVariantFixture {
  readonly rows = [
    { id: 1, name: 'Ada', role: 'Engineer' },
    { id: -1, name: '', role: '', pending: true },
  ];
  readonly rowKey = (row: { id: number }): number => row.id;
  readonly isPending = (row: { pending?: boolean }): boolean => row.pending === true;
}

@Component({
  imports: [ForTable, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable mode="table" aria-label="Nav">
      <for-table-body
        [rows]="rows"
        [rowKey]="rowKey"
        interactiveRows
        [rowClass]="rowClass"
        [rowAttrs]="rowAttrs"
      >
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row.name }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
export class TableBodyRowInteractionFixture {
  readonly rows = [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
  ];
  readonly rowKey = (row: { id: number }): number => row.id;
  readonly rowClass = (row: { id: number }): string => (row.id === 1 ? 'active' : 'idle');
  readonly rowAttrs = (row: { id: number }): Record<string, string | null> =>
    row.id === 1 ? { 'data-open': '' } : {};
}

@Component({
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForColumnDragPlaceholder,
  ],
  template: `
    <div forTable mode="grid" aria-label="Reorderable">
      <for-table-body [rows]="rows" [rowKey]="rowKey">
        <ng-container forColumnDef="name" sortable reorderable>
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="role" reorderable>
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row.role }}</ng-template>
        </ng-container>

        <ng-template forColumnDragPlaceholder>
          <span class="col-ghost"></span>
        </ng-template>
      </for-table-body>
    </div>
  `,
})
export class TableBodyReorderFixture {
  readonly rows = [
    { id: 1, name: 'Ada', role: 'Engineer' },
    { id: 2, name: 'Grace', role: 'Engineer' },
  ];
  readonly rowKey = (row: { id: number }): number => row.id;
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <div forTable mode="treegrid" [expanded]="expanded">
      <div role="rowgroup">
        <div forTableRow [value]="'a'" [level]="1" [expandable]="true">
          <div forTableCell name="name">Parent A</div>
        </div>
        <div forTableRow [value]="'a1'" [level]="2">
          <div forTableCell name="name">Child A1</div>
        </div>
        <div forTableRow [value]="'b'" [level]="1">
          <div forTableCell name="name">Leaf B</div>
        </div>
      </div>
    </div>
  `,
})
export class TableTreegridFixture {
  readonly expanded = ['a'];
}

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableRow, ForTableCell],
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      aria-label="Big"
      [rowCount]="1000"
      #v="forTableVirtualized"
    >
      <div role="rowgroup" [style.height.px]="v.totalSize()" style="position: relative">
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div forTableRow [virtualIndex]="vrow.index">
            <div forTableCell name="a">{{ vrow.index }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TableVirtualizedFixture {}

@Component({
  imports: [ForTable, ForTableVirtualized, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <div forTable forTableVirtualized mode="grid" aria-label="Big" [rowCount]="1000">
      <for-table-body [rows]="rows">
        <ng-container forColumnDef="a">
          <ng-template forHeaderCell>#</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows" let-row>{{ row }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
export class TableBodyVirtualizedFixture {
  readonly rows = Array.from({ length: 1000 }, (_, i) => i);
}

@Component({
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
  ],
  template: `
    <div
      forTable
      forTableVirtualized
      mode="grid"
      aria-label="Big reorder"
      [rowCount]="1000"
      #v="forTableVirtualized"
    >
      <div
        role="rowgroup"
        forTableRowReorder
        [style.height.px]="v.totalSize()"
        style="position: relative"
      >
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div forTableRow [virtualIndex]="vrow.index" forDraggable [dragData]="vrow.index">
            <div forTableCell name="a">{{ vrow.index }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TableVirtualizedReorderFixture {}
