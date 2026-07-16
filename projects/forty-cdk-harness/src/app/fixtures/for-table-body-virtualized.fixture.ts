import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { ForColumnDef, ForDataCell, ForHeaderCell, ForTable, ForTableBody } from 'forty-cdk/table';
import { ForTableVirtualized } from 'forty-cdk/virtualization';

const ROW_COUNT = 10_000;
const ROW_HEIGHT = 44;

interface Row {
  readonly id: number;
  readonly name: string;
}

function buildRows(): readonly Row[] {
  return Array.from({ length: ROW_COUNT }, (_, i) => ({ id: i, name: `Row ${i}` }));
}

@Component({
  selector: 'app-for-table-body-virtualized-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTable, ForTableVirtualized, ForTableBody, ForColumnDef, ForHeaderCell, ForDataCell],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .table-root {
        display: block;
        height: 400px;
        overflow: auto;
        border: 1px solid #ccc;
        position: relative;
        width: 480px;
      }
      [forTableHeaderRow] {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f0f0f0;
        font-weight: bold;
        border-bottom: 2px solid #ccc;
      }
      [forTableRow] {
        height: ${ROW_HEIGHT}px;
        box-sizing: border-box;
        border-bottom: 1px solid #eee;
        background: #fff;
      }
      [forTableHeaderCell],
      [forTableCell] {
        padding: 8px;
        overflow: hidden;
      }
    `,
  ],
  template: `
    <div
      class="table-root"
      #scroll
      data-testid="root"
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Virtualized people"
      [rowCount]="ROW_COUNT"
      [estimateRowSize]="ROW_HEIGHT"
      [scrollElement]="scrollEl()"
    >
      <for-table-body [rows]="data()" [rowKey]="rowKey">
        <ng-container forColumnDef="id" width="80px">
          <ng-template forHeaderCell>#</ng-template>
          <ng-template forDataCell [forDataCellRow]="data()" let-row>{{ row.id }}</ng-template>
        </ng-container>
        <ng-container forColumnDef="name">
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="data()" let-row>{{ row.name }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
export class ForTableBodyVirtualizedFixture {
  protected readonly ROW_COUNT = ROW_COUNT;
  protected readonly ROW_HEIGHT = ROW_HEIGHT;

  protected readonly data = signal<readonly Row[]>(buildRows());
  protected readonly rowKey = (row: Row): number => row.id;

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  protected readonly scrollEl = computed(() => this.scrollRef()?.nativeElement ?? null);
}
