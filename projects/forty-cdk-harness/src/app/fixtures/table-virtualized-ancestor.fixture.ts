import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';
import { ForTableVirtualized } from 'forty-cdk/table-virtualization';

const ROW_COUNT = 10_000;
const ROW_HEIGHT = 44;

@Component({
  selector: 'app-table-virtualized-ancestor-fixture',
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
      .shell {
        height: 400px;
        overflow: auto;
        border: 1px solid #ccc;
      }
      [forTableHeaderRow] {
        display: grid;
        grid-template-columns: 80px 1fr;
        height: ${ROW_HEIGHT}px;
        box-sizing: border-box;
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f0f0f0;
        font-weight: bold;
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
    <button type="button" data-testid="grow-intro" (click)="introHeight.set(introHeight() * 2)">
      Grow intro
    </button>
    <button
      type="button"
      data-testid="scroll-to-500"
      (click)="v.scrollToRow(500, { align: 'start' })"
    >
      Scroll to row 500
    </button>
    <div class="shell" #shell data-testid="shell">
      <div data-testid="intro" [style.height.px]="introHeight()">App-shell content</div>
      <div
        data-testid="root"
        forTable
        forTableVirtualized
        mode="grid"
        ariaLabel="Virtualized table in an ancestor scroller"
        [rowCount]="ROW_COUNT"
        [estimateRowSize]="ROW_HEIGHT"
        [scrollElement]="shell"
        #v="forTableVirtualized"
        style="position: relative"
      >
        <div forTableHeaderRow>
          <div forTableHeaderCell name="id">#</div>
          <div forTableHeaderCell name="name">Name</div>
        </div>
        <div role="rowgroup" [style.height.px]="v.totalSize()" style="position: relative">
          @for (vrow of v.virtualRows(); track vrow.index) {
            <div
              forTableRow
              [virtualIndex]="vrow.index"
              [style.transform]="'translateY(' + vrow.start + 'px)'"
            >
              <div forTableCell name="id">{{ vrow.index }}</div>
              <div forTableCell name="name">Row {{ vrow.index }}</div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class TableVirtualizedAncestorFixture {
  protected readonly ROW_COUNT = ROW_COUNT;
  protected readonly ROW_HEIGHT = ROW_HEIGHT;
  protected readonly introHeight = signal(400);
}
