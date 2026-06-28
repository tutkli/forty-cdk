# Pagination

Headless pagination control implementing a [WAI-ARIA `navigation` landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html) with [`aria-current="page"`](https://www.w3.org/TR/wai-aria-1.2/#aria-current) on the active page. Derives the visible page list (with ellipsis gaps) from `page`, `count`, `siblingCount`, and `boundaryCount`. Ships no styles — apply your own.

## Anatomy

| Class                   | Selector                  | Role                                                                    |
| ----------------------- | ------------------------- | ----------------------------------------------------------------------- |
| `ForPagination`         | `[forPagination]`         | Root. `role="navigation"`. Owns the page model and computed items list. |
| `ForPaginationItem`     | `[forPaginationItem]`     | Page number button. `aria-current="page"` when current.                 |
| `ForPaginationPrevious` | `[forPaginationPrevious]` | Previous-page button. Native `disabled` at the first page.              |
| `ForPaginationNext`     | `[forPaginationNext]`     | Next-page button. Native `disabled` at the last page.                   |

## Examples

```ts
import { Component, signal } from '@angular/core';
import {
  ForPagination,
  ForPaginationItem,
  ForPaginationNext,
  ForPaginationPrevious,
} from 'forty-cdk/pagination';

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

## API

### `ForPagination`

| API             | Type            | Default | Description                                                             |
| --------------- | --------------- | ------- | ----------------------------------------------------------------------- |
| `page`          | `model<number>` | —       | Two-way bindable. The currently active page number.                     |
| `count`         | `input<number>` | —       | Total number of pages.                                                  |
| `siblingCount`  | `input<number>` | —       | Number of page buttons to show on each side of the current page.        |
| `boundaryCount` | `input<number>` | —       | Number of page buttons to always show at the start and end of the list. |
| `ariaLabel`     | `input<string>` | —       | Accessible label for the `navigation` landmark.                         |

### `ForPaginationItem`

| API    | Type            | Default | Description                             |
| ------ | --------------- | ------- | --------------------------------------- |
| `page` | `input<number>` | —       | The page number this button represents. |

### `ForPaginationPrevious`

| API         | Type            | Default | Description                                    |
| ----------- | --------------- | ------- | ---------------------------------------------- |
| `ariaLabel` | `input<string>` | —       | Accessible label for the previous-page button. |

### `ForPaginationNext`

| API         | Type            | Default | Description                                |
| ----------- | --------------- | ------- | ------------------------------------------ |
| `ariaLabel` | `input<string>` | —       | Accessible label for the next-page button. |

## Accessibility

- **Navigation landmark.** `[forPagination]` applies `role="navigation"`. Set `ariaLabel` (e.g. `"Pagination"`) so the landmark is distinguishable from other navigation regions on the page.
- **Current page.** `[forPaginationItem]` reflects `aria-current="page"` on the active page button so screen-reader users know which page they are on.
- **Disabled prev/next.** `[forPaginationPrevious]` and `[forPaginationNext]` use the native `disabled` attribute at the boundaries, which suppresses click and removes the element from the tab order.

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
