import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  signal,
  ViewEncapsulation,
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
import { ForTableVirtualized } from 'forty-cdk/table-virtualization';

const TOTAL = 500;
const GROUP_EVERY = 10;
const DATA_HEIGHT = 40;
const VARIANT_HEIGHT = 80;
const ESTIMATE = DATA_HEIGHT;

type RowKind = 'header' | 'data';

interface Row {
  readonly id: number;
  readonly kind: RowKind;
  readonly label: string;
}

function buildRows(): readonly Row[] {
  return Array.from(
    { length: TOTAL },
    (_, i): Row =>
      i % GROUP_EVERY === 0
        ? { id: i, kind: 'header', label: `Group ${i / GROUP_EVERY}` }
        : { id: i, kind: 'data', label: `Person ${i}` },
  );
}

@Component({
  selector: 'app-for-table-body-measured-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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
      app-for-table-body-measured-fixture {
        display: block;
        padding: 24px;
      }
      app-for-table-body-measured-fixture .table-root {
        display: block;
        height: 400px;
        overflow: auto;
        border: 1px solid #ccc;
        position: relative;
        width: 480px;
      }
      app-for-table-body-measured-fixture [forTableHeaderRow] {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f0f0f0;
        font-weight: bold;
        border-bottom: 2px solid #ccc;
      }
      app-for-table-body-measured-fixture [forTableRow] {
        height: ${DATA_HEIGHT}px;
        box-sizing: border-box;
        border-bottom: 1px solid #eee;
        background: #fff;
      }
      app-for-table-body-measured-fixture [forTableRow]:has([data-row-variant]) {
        height: ${VARIANT_HEIGHT}px;
        background: #eef;
        font-weight: bold;
      }
      app-for-table-body-measured-fixture [forTableHeaderCell],
      app-for-table-body-measured-fixture [forTableCell] {
        padding: 8px;
        overflow: hidden;
      }
      app-for-table-body-measured-fixture [data-row-variant] {
        padding: 8px;
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
      ariaLabel="Measured grouped people"
      [rowCount]="TOTAL"
      [estimateRowSize]="ESTIMATE"
      [scrollElement]="scrollEl()"
    >
      <for-table-body [rows]="data()" [rowKey]="rowKey" measureRows>
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
export class ForTableBodyMeasuredFixture {
  protected readonly TOTAL = TOTAL;
  protected readonly ESTIMATE = ESTIMATE;

  protected readonly data = signal<readonly Row[]>(buildRows());
  protected readonly rowKey = (row: Row): number => row.id;
  protected readonly isVariant = (row: Row): boolean => row.kind === 'header';

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  protected readonly scrollEl = computed(() => this.scrollRef()?.nativeElement ?? null);
}
