import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableSortHeader,
  type TableSortDescriptor,
  type TableSortDirection,
} from 'forty-cdk/table';

import type { DocTableData } from './markdown';

interface SafeCell {
  readonly html: SafeHtml;
  readonly text: string;
}

@Component({
  selector: 'doc-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
    ForTableSortHeader,
  ],
  template: `
    <div class="pg-doc-table-scroll">
      <table forTable ariaLabel="Reference table" class="pg-doc-table">
        <thead>
          <tr forTableHeaderRow>
            @for (column of columns(); track $index) {
              <th
                forTableHeaderCell
                [name]="'c' + $index"
                forTableSortHeader
                [column]="'c' + $index"
                [direction]="directionFor($index)"
                (sortChange)="onSort($index, $event)"
                [innerHTML]="column"
              ></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of sortedRows(); track $index) {
            <tr forTableRow>
              @for (cell of row; track $index) {
                <td forTableCell [name]="'c' + $index" [innerHTML]="cell.html"></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DocTable {
  readonly #sanitizer = inject(DomSanitizer);

  readonly table = input.required<DocTableData>();

  protected readonly sortColumn = signal<number | null>(null);
  protected readonly sortDirection = signal<TableSortDirection>('none');

  protected readonly columns = computed(() =>
    this.table().columns.map((column) => this.#sanitizer.bypassSecurityTrustHtml(column)),
  );

  readonly #rows = computed<readonly (readonly SafeCell[])[]>(() =>
    this.table().rows.map((row) =>
      row.map((cell) => ({
        html: this.#sanitizer.bypassSecurityTrustHtml(cell.html),
        text: cell.text,
      })),
    ),
  );

  protected readonly sortedRows = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection();
    const rows = this.#rows();
    if (column === null || direction === 'none') {
      return rows;
    }
    const factor = direction === 'ascending' ? 1 : -1;
    return [...rows].sort(
      (a, b) => factor * compareCells(a[column]?.text ?? '', b[column]?.text ?? ''),
    );
  });

  protected directionFor(index: number): TableSortDirection {
    return this.sortColumn() === index ? this.sortDirection() : 'none';
  }

  protected onSort(index: number, descriptor: TableSortDescriptor): void {
    this.sortColumn.set(index);
    this.sortDirection.set(descriptor.direction);
  }
}

function compareCells(a: string, b: string): number {
  const numA = Number(a);
  const numB = Number(b);
  if (a !== '' && b !== '' && Number.isFinite(numA) && Number.isFinite(numB)) {
    return numA - numB;
  }
  return a.localeCompare(b);
}
