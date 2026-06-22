import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForPagination,
  ForPaginationItem,
  ForPaginationNext,
  ForPaginationPrevious,
} from 'forty-cdk/pagination';

import { DemoLayout } from '../../../ui/demo-layout';

interface Invoice {
  readonly id: string;
  readonly client: string;
  readonly amount: number;
}

const PAGE_SIZE = 5;

const INVOICES: readonly Invoice[] = Array.from({ length: 23 }, (_, i) => ({
  id: `INV-${String(1001 + i)}`,
  client: ['Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli', 'Stark'][i % 7]!,
  amount: 120 + ((i * 37) % 880),
}));

@Component({
  selector: 'app-pagination-data-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForPagination, ForPaginationItem, ForPaginationPrevious, ForPaginationNext],
  template: `
    <playground-demo
      title="Driving a data list"
      subtitle="Pagination is headless state — derive the page count from your data, then slice the visible rows from page(). Changing the page re-slices the list; the page model is the single source of truth shared by the rows and the controls."
      sourcePath="projects/forty-cdk-playground/src/app/demos/pagination/examples/data.example.ts"
    >
      <div demo class="stage">
        <ul class="rows">
          @for (invoice of pageRows(); track invoice.id) {
            <li class="row">
              <span class="row-id">{{ invoice.id }}</span>
              <span class="row-client">{{ invoice.client }}</span>
              <span class="row-amount">\${{ invoice.amount }}.00</span>
            </li>
          }
        </ul>

        <nav
          forPagination
          #pg="forPagination"
          class="pgn"
          ariaLabel="Invoice pages"
          [(page)]="page"
          [count]="pageCount()"
        >
          <button forPaginationPrevious class="pgn-btn" ariaLabel="Previous page">‹</button>
          @for (item of pg.items(); track $index) {
            @if (item.type === 'page') {
              <button forPaginationItem class="pgn-btn pgn-page" [page]="item.value!">
                {{ item.value }}
              </button>
            } @else {
              <span class="pgn-gap" aria-hidden="true">…</span>
            }
          }
          <button forPaginationNext class="pgn-btn" ariaLabel="Next page">›</button>
        </nav>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          page: <b>{{ page() }}</b> / {{ pageCount() }}<br />
          showing: <b>{{ rangeLabel() }}</b> of {{ total }}
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .stage {
      width: min(440px, 100%);
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .rows {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      margin: 0;
      padding: 0;
      list-style: none;
      min-height: 220px;
    }

    .row {
      display: grid;
      grid-template-columns: 5rem 1fr auto;
      align-items: center;
      gap: 0.75rem;
      padding: 0.55rem 0.8rem;
      font-size: 0.9rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .row-id {
      font-family: var(--pg-font-mono);
      font-size: 0.8rem;
      color: var(--pg-text-muted);
    }

    .row-client {
      font-weight: 600;
      color: var(--pg-text);
    }

    .row-amount {
      font-variant-numeric: tabular-nums;
      color: var(--pg-text);
    }

    .pgn {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }

    .pgn-btn {
      min-width: 2.25rem;
      height: 2.25rem;
      padding: 0 0.5rem;
      font: inherit;
      font-weight: 600;
      color: var(--pg-text);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
    }

    .pgn-btn:hover:not(:disabled):not([aria-current='page']) {
      border-color: var(--pg-border-strong);
      background: var(--pg-surface-2);
    }

    .pgn-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .pgn-page[aria-current='page'] {
      color: var(--pg-primary-contrast);
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      cursor: default;
    }

    .pgn-gap {
      min-width: 1.5rem;
      text-align: center;
      color: var(--pg-text-muted);
      user-select: none;
    }
  `,
})
export class PaginationDataExample {
  protected readonly total = INVOICES.length;
  protected readonly page = signal(1);
  protected readonly pageCount = computed(() => Math.ceil(this.total / PAGE_SIZE));

  protected readonly pageRows = computed<readonly Invoice[]>(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return INVOICES.slice(start, start + PAGE_SIZE);
  });

  protected readonly rangeLabel = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, this.total);
    return `${start + 1}–${end}`;
  });
}
