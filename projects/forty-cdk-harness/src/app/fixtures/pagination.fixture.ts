import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForPagination,
  ForPaginationItem,
  ForPaginationNext,
  ForPaginationPrevious,
} from 'forty-cdk/pagination';

@Component({
  selector: 'app-pagination-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForPagination, ForPaginationItem, ForPaginationPrevious, ForPaginationNext],
  template: `
    <span data-testid="current">{{ page() }}</span>
    <nav forPagination [(page)]="page" [count]="11" ariaLabel="Pagination" #pg="forPagination">
      <button forPaginationPrevious ariaLabel="Previous page" data-testid="prev">‹</button>
      @for (item of pg.items(); track $index) {
        @if (item.type === 'page') {
          <button forPaginationItem [page]="item.value!" [attr.data-testid]="'page-' + item.value">
            {{ item.value }}
          </button>
        } @else {
          <span aria-hidden="true">…</span>
        }
      }
      <button forPaginationNext ariaLabel="Next page" data-testid="next">›</button>
    </nav>
  `,
})
export class PaginationFixture {
  readonly page = signal(1);
}
