import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import {
  ForColumnDef,
  ForDataCell,
  ForHeaderCell,
  ForRowCell,
  ForRowDef,
  ForTable,
  ForTableBody,
} from 'forty-cdk/table';
import { ForTableVirtualized } from 'forty-cdk/virtualization';

const TOTAL = 500;
const MID = 250;
const ROW_HEIGHT = 44;

type RowKind = 'header' | 'data' | 'summary';

interface Row {
  readonly id: number;
  readonly kind: RowKind;
  readonly label: string;
}

function buildRows(): readonly Row[] {
  return Array.from({ length: TOTAL }, (_, i): Row => {
    if (i === 0) {
      return { id: i, kind: 'header', label: 'Team Alpha' };
    }
    if (i === MID) {
      return { id: i, kind: 'header', label: 'Team Beta' };
    }
    if (i === TOTAL - 1) {
      return { id: i, kind: 'summary', label: `${TOTAL - 3} people` };
    }
    return { id: i, kind: 'data', label: `Person ${i}` };
  });
}

@Component({
  selector: 'app-for-table-body-variants-virtualized-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableVirtualized,
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
      [data-row-variant] {
        padding: 8px;
        background: #eef;
        font-weight: bold;
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
      ariaLabel="Grouped virtualized people"
      [rowCount]="TOTAL"
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
          <ng-template forDataCell [forDataCellRow]="data()" let-row>{{ row.label }}</ng-template>
        </ng-container>

        <ng-container forRowDef [when]="isVariant">
          <ng-template forRowCell [forRowCellRow]="data()" let-row>{{ row.label }}</ng-template>
        </ng-container>
      </for-table-body>
    </div>
  `,
})
export class ForTableBodyVariantsVirtualizedFixture {
  protected readonly TOTAL = TOTAL;
  protected readonly ROW_HEIGHT = ROW_HEIGHT;

  protected readonly data = signal<readonly Row[]>(buildRows());
  protected readonly rowKey = (row: Row): number => row.id;
  protected readonly isVariant = (row: Row): boolean => row.kind !== 'data';

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  protected readonly scrollEl = computed(() => this.scrollRef()?.nativeElement ?? null);
}
