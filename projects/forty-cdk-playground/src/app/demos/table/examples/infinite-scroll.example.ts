import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';
import { ForTableVirtualized } from 'forty-cdk/table-virtualization';
import { injectInfiniteScroll } from 'forty-cdk/virtualization';

import { makePeople } from './big-people';
import type { Person } from './people';

const PAGE = 50;
const MAX = 1000;
const LATENCY = 600;

@Component({
  selector: 'app-table-infinite-scroll-example',
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
      <div
        forTable
        forTableVirtualized
        #v="forTableVirtualized"
        mode="grid"
        ariaLabel="People feed"
        class="vtbl"
        [rowCount]="rows().length"
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
              <div forTableCell name="name" class="vtbl-cell">{{ rows()[vrow.index]!.name }}</div>
              <div forTableCell name="role" class="vtbl-cell">{{ rows()[vrow.index]!.role }}</div>
              <div forTableCell name="dept" class="vtbl-cell">{{ rows()[vrow.index]!.dept }}</div>
              <div forTableCell name="location" class="vtbl-cell">
                {{ rows()[vrow.index]!.location }}
              </div>
            </div>
          }
        </div>
      </div>
      <p class="vtbl-status" aria-live="polite">
        Loaded <b>{{ rows().length }}</b> of {{ max }} — {{ statusLabel() }}
      </p>
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

    .vtbl-status {
      margin: 0;
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }

    .vtbl-status b {
      color: var(--pg-text);
      font-weight: 600;
    }
  `,
})
export class TableInfiniteScrollExample {
  protected readonly max = MAX;

  protected readonly rows = signal<readonly Person[]>(makePeople(0, PAGE));

  private readonly tableV = viewChild<ForTableVirtualized>('v');

  private readonly range = computed<readonly [number, number]>(() => {
    const visible = this.tableV()?.virtualRows() ?? [];
    if (visible.length === 0) {
      return [0, 0];
    }
    return [visible[0]!.index, visible[visible.length - 1]!.index + 1];
  });

  protected readonly loader = injectInfiniteScroll({
    range: this.range,
    count: computed(() => this.rows().length),
    threshold: 8,
    disabled: computed(() => this.rows().length >= MAX),
    onLoadMore: () => this.loadMore(),
  });

  protected readonly statusLabel = computed(() => {
    if (this.rows().length >= MAX) {
      return 'all loaded';
    }
    return this.loader.pending() ? 'loading…' : 'idle';
  });

  private loadMore(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.rows.update((current) => [...current, ...makePeople(current.length, PAGE)]);
        resolve();
      }, LATENCY);
    });
  }
}
