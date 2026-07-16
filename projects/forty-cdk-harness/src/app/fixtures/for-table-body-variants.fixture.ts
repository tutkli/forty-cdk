import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForColumnDef,
  ForDataCell,
  ForHeaderCell,
  ForRowCell,
  ForRowDef,
  ForTable,
  ForTableBody,
} from 'forty-cdk/table';

interface Row {
  readonly id: number;
  readonly name?: string;
  readonly role?: string;
  readonly group?: string;
  readonly header?: boolean;
}

const ROWS: readonly Row[] = [
  { id: -1, group: 'Engineers', header: true },
  { id: 1, name: 'Ada', role: 'Engineer' },
  { id: 2, name: 'Grace', role: 'Engineer' },
  { id: -2, group: 'Designers', header: true },
  { id: 3, name: 'Linus', role: 'Designer' },
];

@Component({
  selector: 'app-for-table-body-variants-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableBody,
    ForColumnDef,
    ForHeaderCell,
    ForDataCell,
    ForRowDef,
    ForRowCell,
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
        width: 480px;
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
      [forTableHeaderCell],
      [forTableCell] {
        padding: 8px;
      }
      [data-row-variant] {
        padding: 8px;
        background: #eef;
        font-weight: bold;
      }
    `,
  ],
  template: `
    <div class="table-root" data-testid="root" forTable mode="grid" ariaLabel="Grouped people">
      <for-table-body [rows]="data()" [rowKey]="rowKey">
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="data()" let-row>{{ row.name }}</ng-template>
        </ng-container>

        <ng-container forColumnDef="role">
          <ng-template forHeaderCell>Role</ng-template>
          <ng-template forDataCell [forDataCellRow]="data()" let-row>{{ row.role }}</ng-template>
        </ng-container>

        <ng-container forRowDef [when]="isGroup">
          <ng-template forRowCell [forRowCellRow]="data()" let-row>{{ row.group }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
export class ForTableBodyVariantsFixture {
  protected readonly data = signal(ROWS);
  protected readonly rowKey = (row: Row): number => row.id;
  protected readonly isGroup = (row: Row): boolean => row.header === true;
}
