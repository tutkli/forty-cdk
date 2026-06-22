# Pagination

Headless pagination control implementing a [WAI-ARIA `navigation` landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html) with [`aria-current="page"`](https://www.w3.org/TR/wai-aria-1.2/#aria-current) on the active page. Derives the visible page list (with ellipsis gaps) from `page`, `count`, `siblingCount`, and `boundaryCount`. Ships no styles — apply your own.

## Pieces

| Class                   | Selector                  | Role                                                                    |
| ----------------------- | ------------------------- | ----------------------------------------------------------------------- |
| `ForPagination`         | `[forPagination]`         | Root. `role="navigation"`. Owns the page model and computed items list. |
| `ForPaginationItem`     | `[forPaginationItem]`     | Page number button. `aria-current="page"` when current.                 |
| `ForPaginationPrevious` | `[forPaginationPrevious]` | Previous-page button. Native `disabled` at the first page.              |
| `ForPaginationNext`     | `[forPaginationNext]`     | Next-page button. Native `disabled` at the last page.                   |

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  ForPagination,
  ForPaginationItem,
  ForPaginationPrevious,
  ForPaginationNext,
} from 'forty-cdk';

@Component({
  selector: 'demo-pagination',
  imports: [ForPagination, ForPaginationItem, ForPaginationPrevious, ForPaginationNext],
  template: `
    <nav forPagination [(page)]="page" [count]="20" ariaLabel="Pagination" #pg="forPagination">
      <button forPaginationPrevious ariaLabel="Previous page">‹</button>
      @for (item of pg.items(); track $index) {
        @if (item.type === 'page') {
          <button forPaginationItem [page]="item.value!">{{ item.value }}</button>
        } @else {
          <span aria-hidden="true">…</span>
        }
      }
      <button forPaginationNext ariaLabel="Next page">›</button>
    </nav>
  `,
})
export class DemoPagination {
  readonly page = signal(1);
}
```

## Styling

forty-cdk ships no styles. Style the current page via `[aria-current="page"]` and disabled prev/next via `:disabled`.

```css
[forPaginationItem][aria-current='page'] {
  font-weight: bold;
}

[forPaginationPrevious]:disabled,
[forPaginationNext]:disabled {
  opacity: 0.4;
  pointer-events: none;
}
```
