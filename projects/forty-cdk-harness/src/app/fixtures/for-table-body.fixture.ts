import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForColumnDef,
  ForDataCell,
  ForHeaderCell,
  ForTable,
  ForTableBody,
  ForTableColumnLabel,
  ForTableRowSelector,
  ForTableSelectAll,
  type TableSortDescriptor,
} from 'forty-cdk/table';

interface Person {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly dept: string;
}

const PEOPLE: readonly Person[] = [
  {
    id: 1,
    name: 'Ada Lovelace — first programmer, long descriptive label',
    role: 'Engineer',
    dept: 'R&D',
  },
  {
    id: 2,
    name: 'Grace Hopper — compiler pioneer, long descriptive label',
    role: 'Engineer',
    dept: 'R&D',
  },
  {
    id: 3,
    name: 'Linus Torvalds — kernel maintainer, long descriptive label',
    role: 'Designer',
    dept: 'OS',
  },
  {
    id: 4,
    name: 'Margaret Hamilton — flight software, long descriptive label',
    role: 'Manager',
    dept: 'Ops',
  },
];

@Component({
  selector: 'app-for-table-body-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    JsonPipe,
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForTableColumnLabel,
    ForTableRowSelector,
    ForTableSelectAll,
  ],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .table-root {
        display: block;
        max-height: 420px;
        overflow: auto;
        border: 1px solid #ccc;
        width: 640px;
      }
      [forTableHeaderRow] {
        position: sticky;
        top: 0;
        background: #f0f0f0;
        font-weight: bold;
        border-bottom: 2px solid #ccc;
      }
      [forTableRow] {
        border-bottom: 1px solid #eee;
      }
      [forTableRow][data-selected] {
        background: #e3f2fd;
      }
      [forTableHeaderCell],
      [forTableCell] {
        padding: 8px;
        overflow: hidden;
        white-space: nowrap;
        min-width: 0;
      }
      [forTableColumnResizer] {
        cursor: col-resize;
        border: 0;
        background: #bbb;
        width: 6px;
        height: 12px;
        margin-left: 6px;
        padding: 0;
      }
      [forTableRowSelector],
      [forTableSelectAll] {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 1px solid #888;
        cursor: pointer;
      }
      [forTableRowSelector][data-state='checked'],
      [forTableSelectAll][data-state='checked'] {
        background: #1976d2;
      }
    `,
  ],
  template: `
    <div
      class="table-root"
      data-testid="root"
      forTable
      mode="grid"
      ariaLabel="People"
      selectionMode="multiple"
    >
      <for-table-body
        [rows]="sortedRows()"
        [rowKey]="rowKey"
        [sort]="sort()"
        [(columnWidths)]="widths"
        (sortChange)="onSort($event)"
      >
        <ng-container forColumnDef="sel" sticky width="48px">
          <ng-template forHeaderCell>
            <button
              type="button"
              forTableSelectAll
              ariaLabel="Select all rows"
              aria-label="Select all rows"
              data-testid="select-all"
            ></button>
          </ng-template>
          <ng-template forDataCell [forDataCellRow]="sortedRows()" let-row>
            <span forTableRowSelector></span>
          </ng-template>
        </ng-container>

        <ng-container forColumnDef="id" width="80px">
          <ng-template forHeaderCell>#</ng-template>
          <ng-template forDataCell [forDataCellRow]="sortedRows()" let-row>{{
            row.id
          }}</ng-template>
        </ng-container>

        <ng-container
          forColumnDef="name"
          sticky
          sortable
          resizable
          resizeAriaLabel="Resize Name"
          [resizeMin]="80"
          [resizeMax]="600"
          [resizeStep]="24"
        >
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="sortedRows()" let-row>{{
            row.name
          }}</ng-template>
        </ng-container>

        <ng-container forColumnDef="role" sortable>
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="sortedRows()" let-row>{{
            row.role
          }}</ng-template>
        </ng-container>

        <ng-container
          forColumnDef="dept"
          resizable
          fitIncludesHeader
          resizeAriaLabel="Resize Department"
        >
          <ng-template forHeaderCell>
            <span forTableColumnLabel>Department of Engineering</span>
          </ng-template>
          <ng-template forDataCell [forDataCellRow]="sortedRows()" let-row>{{
            row.dept
          }}</ng-template>
        </ng-container>
      </for-table-body>

      <pre data-testid="widths">{{ widths() | json }}</pre>
    </div>
  `,
})
export class ForTableBodyFixture {
  protected readonly rowKey = (row: Person): number => row.id;

  protected readonly sort = signal<TableSortDescriptor | null>(null);

  protected readonly widths = signal<Readonly<Record<string, number>>>({ dept: 70 });

  protected readonly sortedRows = computed<readonly Person[]>(() => {
    const descriptor = this.sort();
    if (!descriptor || descriptor.direction === 'none') {
      return PEOPLE;
    }
    const key = descriptor.column as keyof Person;
    const factor = descriptor.direction === 'ascending' ? 1 : -1;
    return [...PEOPLE].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * factor);
  });

  protected onSort(descriptor: TableSortDescriptor): void {
    this.sort.set(descriptor);
  }
}
