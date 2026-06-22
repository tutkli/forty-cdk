import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';
import { ForTableVirtualized } from 'forty-cdk/virtualization';

import { DemoLayout } from '../../../ui/demo-layout';
import { makePeople } from './big-people';
import type { Person } from './people';

@Component({
  selector: 'app-table-virtualized-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTable,
    ForTableVirtualized,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
  ],
  template: `
    <playground-demo
      title="Virtualized rows (10,000)"
      subtitle="[forTableVirtualized] sits on the same element as [forTable] in <div> grid mode (native <table> can't omit rows mid-body). Set [rowCount] to the true total — it drives both aria-rowcount and the window size. The sticky header lives outside the absolutely-positioned body; each [forTableRow] gets [virtualIndex] (driving the absolute aria-rowindex) and a translateY transform. Roving 2D keyboard navigation works across the full 10,000 rows, scrolling out-of-window cells into view on demand."
      sourcePath="projects/forty-cdk-playground/src/app/demos/table/examples/virtualized.example.ts"
    >
      <div demo class="vtbl-demo">
        <div
          forTable
          forTableVirtualized
          #v="forTableVirtualized"
          mode="grid"
          ariaLabel="People"
          class="vtbl"
          [rowCount]="rows.length"
          [estimateRowSize]="40"
        >
          <div forTableHeaderRow class="vtbl-row vtbl-head">
            <div forTableHeaderCell name="name" class="vtbl-cell">Name</div>
            <div forTableHeaderCell name="role" class="vtbl-cell">Role</div>
            <div forTableHeaderCell name="dept" class="vtbl-cell">Department</div>
            <div forTableHeaderCell name="location" class="vtbl-cell">Location</div>
          </div>
          <div role="rowgroup" class="vtbl-body" [style.height.px]="v.totalSize()">
            @for (vrow of v.virtualRows(); track vrow.index) {
              <div
                forTableRow
                class="vtbl-row vtbl-data-row"
                [virtualIndex]="vrow.index"
                [style.transform]="'translateY(' + vrow.start + 'px)'"
              >
                <div forTableCell name="name" class="vtbl-cell">{{ rows[vrow.index]!.name }}</div>
                <div forTableCell name="role" class="vtbl-cell">{{ rows[vrow.index]!.role }}</div>
                <div forTableCell name="dept" class="vtbl-cell">{{ rows[vrow.index]!.dept }}</div>
                <div forTableCell name="location" class="vtbl-cell">
                  {{ rows[vrow.index]!.location }}
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="v.scrollToRow(0, { align: 'start' })">
            Top
          </button>
          <button type="button" class="pg-btn" (click)="v.scrollToRow(5000, { align: 'center' })">
            Row 5,000
          </button>
          <button
            type="button"
            class="pg-btn"
            (click)="v.scrollToRow(rows.length - 1, { align: 'end' })"
          >
            Bottom
          </button>
        </div>
        <p class="pg-hint">
          Tab into the grid and arrow around — focus crosses the whole 10,000-row set, scrolling
          off-window rows into view. Only a few dozen rows are ever in the DOM.
        </p>
        <p class="pg-state">
          total rows: <b>{{ rows.length.toLocaleString() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .vtbl-demo {
      width: min(640px, 100%);
    }

    .vtbl {
      width: 100%;
      height: 380px;
      overflow: auto;
      position: relative;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      font-size: 0.88rem;
    }

    .vtbl-row {
      display: grid;
      grid-template-columns: 1.6fr 1fr 1.2fr 1fr;
    }

    .vtbl-head {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--pg-surface-2);
      font-weight: 700;
    }

    .vtbl-body {
      position: relative;
    }

    .vtbl-data-row {
      position: absolute;
      left: 0;
      right: 0;
    }

    .vtbl-cell {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--pg-border);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      outline: none;
    }

    .vtbl-head .vtbl-cell {
      border-bottom: 2px solid var(--pg-border-strong);
    }

    .vtbl-cell[data-highlighted],
    .vtbl-cell:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
      background: color-mix(in srgb, var(--pg-primary) 10%, transparent);
    }
  `,
})
export class TableVirtualizedExample {
  protected readonly rows: readonly Person[] = makePeople(0, 10000);
}
