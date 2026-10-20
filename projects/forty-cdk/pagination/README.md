---
title: Pagination
group: primitives
archetype: [composable-ui]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html
---

# Pagination

A navigation landmark that derives a visible page list with ellipsis gaps from page, count, siblingCount and boundaryCount, with previous / next buttons and aria-current='page' on the active page.

## Anatomy

```html
<nav forPagination [(page)]="page" [count]="20" ariaLabel="Pagination" #pg="forPagination">
  <button forPaginationPrevious ariaLabel="Previous page">
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="m15.75 19.5-7.5-7.5 7.5-7.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>

  <!-- one item per entry in pg.items() — a page button per 'page' entry -->
  <button forPaginationItem [page]="item.value!">{{ item.value }}</button>
  <!-- an aria-hidden gap per 'ellipsis' entry -->
  <span aria-hidden="true">…</span>

  <button forPaginationNext ariaLabel="Next page">
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="m8.25 4.5 7.5 7.5-7.5 7.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</nav>
```

## Examples

Walk the pages with the pointer or the keyboard. The current page is `aria-current="page"`, and the ends reflect `data-disabled` on the arrow that has nowhere to go.

```ts
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
      <button forPaginationPrevious class="pgn-btn pgn-nav" ariaLabel="Previous page">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m15.75 19.5-7.5-7.5 7.5-7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      @for (item of pg.items(); track item.key) {
        @if (item.type === 'page') {
          <button forPaginationItem class="pgn-btn pgn-page" [page]="item.value!">
            {{ item.value }}
          </button>
        } @else {
          <span class="pgn-gap" aria-hidden="true">…</span>
        }
      }

      <button forPaginationNext class="pgn-btn pgn-nav" ariaLabel="Next page">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </nav>
  `,
})
export class PaginationDefaultExample {
  protected readonly page = signal(1);
}
```

### Driving a data list

Pagination is headless state: derive `count` from your data, then slice the visible rows from `page()`. Changing the page re-slices the list; the `page` model is the single source of truth shared by the rows and the controls.

## API

### `ForPagination`

| Property        | Type                            | Description                                                                                                                                                                                                               |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page`          | `model<number>`                 | Two-way bindable. The currently active page number, 1-based.<br>**Default:** `1`                                                                                                                                          |
| `count`         | `input.required<number>`        | Total number of pages. Required.<br>**Default:** —                                                                                                                                                                        |
| `siblingCount`  | `input<number>`                 | Number of page buttons to show on each side of the current page.<br>**Default:** `1`, or the scope's `provideForPaginationDefaults`                                                                                       |
| `boundaryCount` | `input<number>`                 | Number of page buttons to always show at the start and end of the list.<br>**Default:** `1`, or the scope's `provideForPaginationDefaults`                                                                                |
| `disabled`      | `input<boolean>`                | When true, disables every page item and the previous / next buttons.<br>**Default:** `false`                                                                                                                              |
| `dir`           | `input<'ltr' \| 'rtl' \| null>` | Writing direction, reflected to the host `dir` attribute. It changes the visual layout only: previous / next keep their meaning. `null` inherits the nearest `[dir]` / `<html dir>`, else `'ltr'`.<br>**Default:** `null` |
| `ariaLabel`     | `input<string \| null>`         | Accessible label for the `navigation` landmark.<br>**Default:** `null` (and empty string) emits no attribute                                                                                                              |

| Data attribute  | Values                                    |
| --------------- | ----------------------------------------- |
| `data-disabled` | present (no value) when `disabled` is set |

### `ForPaginationItem`

| Property   | Type                     | Description                                                                                          |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `page`     | `input.required<number>` | The 1-based page number this button represents. Required.<br>**Default:** —                          |
| `disabled` | `input<boolean>`         | Disables this page button on its own; the root's `disabled` disables it too.<br>**Default:** `false` |

### `ForPaginationPrevious`

| Property    | Type                    | Description                                                                                                 |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ariaLabel` | `input<string \| null>` | Accessible label for the previous-page button.<br>**Default:** `null` (and empty string) emits no attribute |

### `ForPaginationNext`

| Property    | Type                    | Description                                                                                             |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `ariaLabel` | `input<string \| null>` | Accessible label for the next-page button.<br>**Default:** `null` (and empty string) emits no attribute |

## Scoped defaults

`provideForPaginationDefaults` configures pagination defaults for an injector subtree, either at the application root or in any component's `providers` array. Partial overrides inherit unspecified keys from the parent scope (or the library fallbacks at the root).

| Key             | Library fallback | Meaning                                                                                                                                           |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `siblingCount`  | `1`              | Pages shown on each side of the current page before the range collapses to an ellipsis, for paginations that don't set `siblingCount` themselves. |
| `boundaryCount` | `1`              | Pages always shown at each end of the list, for paginations that don't set `boundaryCount` themselves.                                            |

Per-instance inputs always win over the scope defaults.

```ts
import { type ApplicationConfig } from '@angular/core';
import { provideForPaginationDefaults } from 'forty-cdk/defaults';

export const appConfig: ApplicationConfig = {
  providers: [provideForPaginationDefaults({ siblingCount: 2 })],
};
```

## Accessibility

Implements the [WAI-ARIA navigation landmark pattern](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html).

- **Navigation landmark.** `[forPagination]` applies `role="navigation"`. Set `ariaLabel` (e.g. `"Pagination"`) so the landmark is distinguishable from other navigation regions on the page.
- **Current page.** `[forPaginationItem]` reflects `aria-current="page"` on the active page button so screen-reader users know which page they are on.
- **Focus stays on the activated page.** Track `pg.items()` by `item.key`, never by `$index`. Activating a page near the edge of the window shifts the list, and a key keeps that button's element, so focus stays on the page the user chose and it becomes `aria-current`. Tracked by `$index`, the focused button is handed to a different page.
- **Disabled prev/next.** `[forPaginationPrevious]` and `[forPaginationNext]` reflect `aria-disabled="true"` + `data-disabled` at the boundaries (and when the root is disabled), never the native `disabled` attribute. Activation is a no-op while disabled, and the button stays focusable, so a keyboard user who presses Next on the second-to-last page keeps focus on it instead of being sent to `<body>`.

## Styling

forty-cdk ships no styles. Style the current page via `[aria-current="page"]` and disabled pieces via `[data-disabled]`, which previous / next and page items all reflect.

```css
[forPaginationItem][aria-current='page'] {
  font-weight: bold;
}

[forPaginationPrevious][data-disabled],
[forPaginationNext][data-disabled] {
  opacity: 0.4;
}
```

## Wrapping in a design system

Subclass the root and re-provide `FOR_PAGINATION_CONTEXT` with `useExisting` pointing at the subclass, since Angular does not inherit a directive's `providers`; [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md) walks the pattern.
