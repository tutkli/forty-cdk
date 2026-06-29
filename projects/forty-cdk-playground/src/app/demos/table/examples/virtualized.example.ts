import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';
import { ForTableVirtualized } from 'forty-cdk/virtualization';

import { makePeople } from './big-people';
import type { Person } from './people';

@Component({
  selector: 'app-table-virtualized-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTable,
    ForTableVirtualized,
    ForTableHeaderRow,
    ForTableRow,
    ForTableHeaderCell,
    ForTableCell,
  ],
  template: `
    <div class="vtbl-demo">
      <div class="vtbl-toolbar">
        <button type="button" class="vtbl-btn" (click)="v.scrollToRow(0, { align: 'start' })">
          Top
        </button>
        <button type="button" class="vtbl-btn" (click)="v.scrollToRow(5000, { align: 'center' })">
          Row 5,000
        </button>
        <button
          type="button"
          class="vtbl-btn"
          (click)="v.scrollToRow(rows.length - 1, { align: 'end' })"
        >
          Bottom
        </button>
      </div>
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
  `,
  styles: `
    :host {
      display: contents;
    }

    .vtbl-demo {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: min(640px, 100%);
    }

    .vtbl-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .vtbl-btn {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.4rem 0.8rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .vtbl-btn:hover {
      background: var(--pg-surface-2);
    }

    .vtbl-btn:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: 2px;
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
