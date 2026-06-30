# Pagination

A navigation landmark that derives a visible page list with ellipsis gaps from page, count, siblingCount and boundaryCount, with previous / next buttons and aria-current='page' on the active page.

## Anatomy

```html
<nav forPagination [(page)]="page" [count]="20" ariaLabel="Pagination" #pg="forPagination">
  <button forPaginationPrevious ariaLabel="Previous page">‹</button>

  <!-- one item per entry in pg.items() — a page button per 'page' entry -->
  <button forPaginationItem [page]="item.value!">{{ item.value }}</button>
  <!-- an aria-hidden gap per 'ellipsis' entry -->
  <span aria-hidden="true">…</span>

  <button forPaginationNext ariaLabel="Next page">›</button>
</nav>
```

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

| Property        | Type            | Description                                                                               |
| --------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `page`          | `model<number>` | Two-way bindable. The currently active page number.<br>**Default:** —                     |
| `count`         | `input<number>` | Total number of pages.<br>**Default:** —                                                  |
| `siblingCount`  | `input<number>` | Number of page buttons to show on each side of the current page.<br>**Default:** —        |
| `boundaryCount` | `input<number>` | Number of page buttons to always show at the start and end of the list.<br>**Default:** — |
| `ariaLabel`     | `input<string>` | Accessible label for the `navigation` landmark.<br>**Default:** —                         |

| Data attribute  | Values                                    |
| --------------- | ----------------------------------------- |
| `data-disabled` | present (no value) when `disabled` is set |

### `ForPaginationItem`

| Property | Type            | Description                                               |
| -------- | --------------- | --------------------------------------------------------- |
| `page`   | `input<number>` | The page number this button represents.<br>**Default:** — |

### `ForPaginationPrevious`

| Property    | Type            | Description                                                      |
| ----------- | --------------- | ---------------------------------------------------------------- |
| `ariaLabel` | `input<string>` | Accessible label for the previous-page button.<br>**Default:** — |

### `ForPaginationNext`

| Property    | Type            | Description                                                  |
| ----------- | --------------- | ------------------------------------------------------------ |
| `ariaLabel` | `input<string>` | Accessible label for the next-page button.<br>**Default:** — |

## Accessibility

Implements the [WAI-ARIA navigation landmark pattern](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html).

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
