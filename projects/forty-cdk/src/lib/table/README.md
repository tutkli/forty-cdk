# ForTable

Headless table primitive that decorates either a native `<table>` or a `<div role>` CSS-grid structure with correct WAI-ARIA table semantics. Implements the [WAI-ARIA Table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/) and the [WAI-ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

The library sets roles, `aria-label`, writing direction, `data-column`, sticky hooks, and (in grid mode) `aria-rowcount` / `aria-colcount` / `aria-rowindex` / `aria-colindex` and roving keyboard navigation. The consumer owns all styles.

## Native `<table>` mode

```html
<table forTable [ariaLabel]="caption">
  <thead>
    <tr forTableHeaderRow>
      <th forTableHeaderCell name="name" sticky>Name</th>
      <th forTableHeaderCell name="role">Role</th>
    </tr>
  </thead>
  <tbody>
    <tr forTableRow>
      <td forTableCell name="name">Ada Lovelace</td>
      <td forTableCell name="role">Engineer</td>
    </tr>
  </tbody>
</table>
```

## `<div>` mode (required for virtualization)

When you need virtual scrolling, use `<div role>` structure with `mode="grid"` on the root. The `<div>` mode is the only shape supported by virtualizers because native `<table>` cannot have its rows omitted from the DOM mid-body. All pieces accept any element.

```html
<div
  forTable
  mode="grid"
  ariaLabel="People"
  style="display: grid; grid-template-columns: 1fr 1fr; overflow-y: auto; max-height: 400px;"
>
  <div role="rowgroup">
    <div forTableHeaderRow style="display: contents;">
      <div forTableHeaderCell name="name" sticky style="position: sticky; top: 0;">Name</div>
      <div forTableHeaderCell name="role" sticky style="position: sticky; top: 0;">Role</div>
    </div>
  </div>
  <div role="rowgroup">
    @for (row of rows(); track row.id) {
    <div forTableRow style="display: contents;">
      <div forTableCell name="name">{{ row.name }}</div>
      <div forTableCell name="role">{{ row.role }}</div>
    </div>
    }
  </div>
</div>
```

## Sticky header + CSS custom property

`ForTable` measures the header row height with `ResizeObserver` and exposes it as `--for-table-header-height` on the root host (the header row must generate a box — use `display: grid` / `flex` on `[forTableHeaderRow]`, not `display: contents`). Use it to keep data cells stuck below the header row without hard-coding a pixel offset that drifts when the header content wraps:

```css
[forTableHeaderCell][data-sticky] {
  position: sticky;
  top: 0;
  z-index: 1;
}

[forTableCell][data-sticky] {
  position: sticky;
  left: 0; /* start-edge sticky */
  z-index: 1;
}

[forTableCell][data-sticky='end'] {
  position: sticky;
  right: 0; /* end-edge sticky */
}
```

End-edge sticky cells use `sticky="end"` on the directive:

```html
<th forTableHeaderCell name="actions" sticky="end">Actions</th>
<td forTableCell name="actions" sticky="end">…</td>
```

## Grid mode (keyboard navigation)

`mode="grid"` (or `mode="treegrid"`) turns the data cells into a single-tab-stop roving group with 2D keyboard navigation. Arrow keys move focus between cells; `Home` / `End` jump to the first / last cell of the current row; `Ctrl+Home` / `Ctrl+End` jump to the first / last cell of the entire grid; `PageUp` / `PageDown` jump to the first / last cell of the grid. All horizontal movement is RTL-mirrored when the resolved writing direction is `rtl`. Disabled cells (set via the cell's `disabled` input) are skipped during navigation.

The root emits `aria-rowcount` and `aria-colcount` (defaulting to the rendered data-row count and the column count of the first data row). Override them for server-paged or virtualized tables via the `rowCount` and `colCount` inputs. Data rows emit `aria-rowindex` (1-based). Data cells emit `aria-colindex` (1-based) and `data-highlighted` on the currently focused cell.

```html
<div forTable mode="grid" ariaLabel="People" [rowCount]="totalRows">
  <div role="rowgroup">
    <div forTableHeaderRow>
      <div forTableHeaderCell name="name">Name</div>
      <div forTableHeaderCell name="role">Role</div>
    </div>
  </div>
  <div role="rowgroup">
    @for (row of rows(); track row.id) {
    <div forTableRow>
      <div forTableCell name="name" [disabled]="row.disabled">{{ row.name }}</div>
      <div forTableCell name="role">{{ row.role }}</div>
    </div>
    }
  </div>
</div>
```

```css
[forTableCell][data-highlighted] {
  outline: 2px solid blue;
}

[forTableCell][data-disabled] {
  opacity: 0.4;
}
```

## Inputs

| Directive              | Input       | Type                              | Default        | Description                                                             |
| ---------------------- | ----------- | --------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `[forTable]`           | `mode`      | `'table' \| 'grid' \| 'treegrid'` | `'table'`      | ARIA role emitted on the host.                                          |
| `[forTable]`           | `ariaLabel` | `string \| null`                  | `null`         | Reactive accessible label.                                              |
| `[forTable]`           | `dir`       | `'ltr' \| 'rtl' \| null`          | `null`         | Writing direction; resolves ambient when unset.                         |
| `[forTable]`           | `rowCount`  | `number`                          | rendered count | True total data-row count for `aria-rowcount`. Ignored in `table` mode. |
| `[forTable]`           | `colCount`  | `number`                          | rendered count | True total column count for `aria-colcount`. Ignored in `table` mode.   |
| `[forTableHeaderCell]` | `name`      | `string` (required)               | —              | Column identifier, reflected as `data-column`.                          |
| `[forTableHeaderCell]` | `sticky`    | `boolean \| 'end'`                | `false`        | Sticky edge; reflected as `data-sticky`.                                |
| `[forTableCell]`       | `name`      | `string` (required)               | —              | Column identifier, reflected as `data-column`.                          |
| `[forTableCell]`       | `sticky`    | `boolean \| 'end'`                | `false`        | Sticky edge; reflected as `data-sticky`.                                |
| `[forTableCell]`       | `disabled`  | `boolean`                         | `false`        | Skipped during navigation; reflects `aria-disabled` / `data-disabled`.  |

## CSS hooks

| Token / attribute           | Emitted by         | Description                                                           |
| --------------------------- | ------------------ | --------------------------------------------------------------------- |
| `--for-table-header-height` | `[forTable]`       | Header row height in px. Updated on resize.                           |
| `data-mode`                 | `[forTable]`       | `'table' \| 'grid' \| 'treegrid'`                                     |
| `data-column`               | header / data cell | Column name from the `name` input.                                    |
| `data-sticky`               | header / data cell | `''` (start-edge) or `'end'` when sticky; absent otherwise.           |
| `data-highlighted`          | `[forTableCell]`   | Present on the currently roving-focused cell in grid / treegrid mode. |
| `aria-rowindex`             | `[forTableRow]`    | 1-based row index in the data row set. Absent in table mode.          |
| `aria-colindex`             | `[forTableCell]`   | 1-based column index within the row. Absent in table mode.            |
