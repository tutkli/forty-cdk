import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { ForDraggable, moveItemInArray } from 'forty-cdk/drag-drop';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowReorder,
  type TableRowReorderDescriptor,
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
  selector: 'app-table-virtualized-reorder-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
    ForTableRowReorder,
    ForDraggable,
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
    <div data-testid="last-reorder">{{ lastReorderText() }}</div>

    <div
      class="table-root"
      #scroll
      data-testid="root"
      forTable
      forTableVirtualized
      mode="grid"
      ariaLabel="Virtualized reorderable table"
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
        role="rowgroup"
        forTableRowReorder
        lockAxis="y"
        [style.height.px]="v.totalSize()"
        style="position: relative"
        data-testid="scroll-body"
        (rowReorder)="onReorder($event)"
      >
        @for (vrow of v.virtualRows(); track vrow.index) {
          <div
            forTableRow
            [virtualIndex]="vrow.index"
            forDraggable
            [dragData]="vrow.index"
            [attr.data-index]="vrow.index"
            [style.transform]="'translateY(' + vrow.start + 'px)'"
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
export class TableVirtualizedReorderFixture {
  protected readonly ROW_COUNT = ROW_COUNT;
  protected readonly ROW_HEIGHT = ROW_HEIGHT;

  protected readonly data = signal<readonly Row[]>(buildRows());

  protected readonly lastReorder = signal<TableRowReorderDescriptor | null>(null);
  protected readonly lastReorderText = computed(() => {
    const r = this.lastReorder();
    return r ? `${r.from}->${r.to}` : 'none';
  });

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  protected readonly scrollEl = computed(() => this.scrollRef()?.nativeElement ?? null);

  protected onReorder(d: TableRowReorderDescriptor): void {
    this.lastReorder.set(d);
    this.data.update((rows) => moveItemInArray(rows, d.from, d.to));
  }
}
