import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForPagination,
  ForPaginationItem,
  ForPaginationNext,
  ForPaginationPrevious,
} from 'forty-cdk/pagination';

@Component({
  selector: 'app-pagination-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForPagination, ForPaginationItem, ForPaginationPrevious, ForPaginationNext],
  template: `
    <nav
      forPagination
      #pg="forPagination"
      class="pgn"
      ariaLabel="Pagination"
      [(page)]="page"
      [count]="20"
      [siblingCount]="1"
      [boundaryCount]="1"
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
  `,
  styles: `
    :host {
      display: contents;
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
export class PaginationDefaultExample {
  protected readonly page = signal(1);
}
