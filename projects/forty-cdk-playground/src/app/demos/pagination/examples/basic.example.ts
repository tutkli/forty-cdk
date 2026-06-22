import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForPagination,
  ForPaginationItem,
  ForPaginationNext,
  ForPaginationPrevious,
} from 'forty-cdk/pagination';

import { ControlSelect, type ControlOption } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-pagination-basic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForPagination,
    ForPaginationItem,
    ForPaginationPrevious,
    ForPaginationNext,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Page navigation with ellipsis"
      subtitle="forPagination derives the visible page list — boundaryCount pages pinned at each end, siblingCount around the current page, the rest collapsed into ellipsis gaps. Previous / Next get the native disabled attribute at the bounds; the active page reflects aria-current='page'."
      sourcePath="projects/forty-cdk-playground/src/app/demos/pagination/examples/basic.example.ts"
    >
      <div demo>
        <nav
          forPagination
          #pg="forPagination"
          class="pgn"
          ariaLabel="Pagination"
          [(page)]="page"
          [count]="count()"
          [siblingCount]="siblingCount()"
          [boundaryCount]="boundaryCount()"
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
        <app-control-select label="Total pages" [options]="countOptions" [(value)]="countStr" />
        <app-control-select
          label="Sibling count"
          hint="Pages shown on each side of the current page before collapsing to an ellipsis."
          [options]="siblingOptions"
          [(value)]="siblingStr"
        />
        <app-control-select
          label="Boundary count"
          hint="Pages always shown at the first and last ends of the trail."
          [options]="boundaryOptions"
          [(value)]="boundaryStr"
        />

        <p class="pg-state">
          page: <b>{{ page() }}</b> / {{ count() }}
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
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
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
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

    @media (prefers-reduced-motion: reduce) {
      .pgn-btn {
        transition: none;
      }
    }
  `,
})
export class PaginationBasicExample {
  protected readonly page = signal(1);

  protected readonly countStr = signal('20');
  protected readonly siblingStr = signal('1');
  protected readonly boundaryStr = signal('1');

  protected readonly count = computed(() => Number(this.countStr()));
  protected readonly siblingCount = computed(() => Number(this.siblingStr()));
  protected readonly boundaryCount = computed(() => Number(this.boundaryStr()));

  protected readonly countOptions: readonly ControlOption[] = [
    { value: '5', label: '5' },
    { value: '20', label: '20' },
    { value: '50', label: '50' },
  ];

  protected readonly siblingOptions: readonly ControlOption[] = [
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
  ];

  protected readonly boundaryOptions: readonly ControlOption[] = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
  ];
}
