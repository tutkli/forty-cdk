import {
  afterEveryRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';
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
  selector: 'app-table-virtualized-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
  ],
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
      }
      .table-root {
        height: 400px;
        overflow: auto;
        border: 1px solid #ccc;
        position: relative;
      }
      [forTableHeaderRow] {
        display: grid;
        grid-template-columns: 80px 1fr;
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f0f0f0;
        font-weight: bold;
        border-bottom: 2px solid #ccc;
      }
      [forTableRow] {
        display: grid;
        grid-template-columns: 80px 1fr;
        height: ${ROW_HEIGHT}px;
        position: absolute;
        left: 0;
        right: 0;
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
      ariaLabel="Virtualized table"
      [rowCount]="ROW_COUNT"
      [estimateRowSize]="ROW_HEIGHT"
      [scrollElement]="scrollEl()"
      #v="forTableVirtualized"
    >
      <div forTableHeaderRow>
        <div forTableHeaderCell name="id" data-testid="header-id">#</div>
        <div forTableHeaderCell name="name" data-testid="header-name">Name</div>
      </div>
      <div
        data-testid="virt-range"
        style="position: absolute; width: 0; height: 0"
        [attr.data-range]="v.range()[0] + ',' + v.range()[1]"
      ></div>
      <div
        role="rowgroup"
        [style.height.px]="v.totalSize()"
        style="position: relative"
        data-testid="scroll-body"
      >
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div
            #row
            forTableRow
            [virtualIndex]="vrow.index"
            [attr.data-index]="vrow.index"
            [style.transform]="'translateY(' + vrow.start + 'px)'"
            [style.height.px]="measured ? measuredRowHeight(vrow.index) : null"
            [attr.data-testid]="'row-' + vrow.index"
          >
            <div forTableCell name="id" [attr.data-testid]="'cell-' + vrow.index + '-id'">
              {{ vrow.index }}
            </div>
            <div forTableCell name="name" [attr.data-testid]="'cell-' + vrow.index + '-name'">
              {{ data()[vrow.index]!.name }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TableVirtualizedFixture {
  protected readonly ROW_COUNT = ROW_COUNT;
  protected readonly ROW_HEIGHT = ROW_HEIGHT;

  private readonly route = inject(ActivatedRoute);

  protected readonly data = signal<readonly Row[]>(buildRows());

  protected readonly measured = this.route.snapshot.queryParamMap.get('measured') === 'true';

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  protected readonly scrollEl = computed(() => this.scrollRef()?.nativeElement ?? null);

  private readonly virtualized = viewChild(ForTableVirtualized);
  private readonly rowEls = viewChildren<ElementRef<HTMLElement>>('row');

  constructor() {
    afterEveryRender(() => {
      if (!this.measured) return;
      const v = this.virtualized();
      if (!v) return;
      for (const row of this.rowEls()) {
        v.measureRow(row.nativeElement);
      }
    });
  }

  protected measuredRowHeight(index: number): number {
    return index % 2 === 0 ? 60 : 100;
  }
}
