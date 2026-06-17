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

## Row selection

Add `selectionMode` to `[forTable]` to enable row selection. Use `[forTableRowSelector]` for a per-row decorative affordance and `[forTableSelectAll]` in the header for a tri-state select-all checkbox.

### `selectionMode`

- `'none'` (default) — selection is disabled. No `aria-selected` or `aria-multiselectable` is emitted.
- `'single'` — at most one row can be selected. Rows emit `aria-selected="true"` or `"false"`.
- `'multiple'` — any number of rows can be selected. The root emits `aria-multiselectable="true"`.

### `selectionBehavior`

Controls how a row click (on the row or on a cell) mutates the selection:

- `'toggle'` (default) — clicking a row always flips its selected state.
- `'replace'` (React-Aria semantics) — clicking a row replaces the selection with that single row. Modifier keys in `'multiple'` mode: **Ctrl/Cmd-click** toggles the clicked row without clearing others; **Shift-click** extends a range from the last anchor to the clicked row.

### `[(selection)]`

A two-way-bindable `model<readonly unknown[]>()`. Single mode keeps 0–1 entries. The implicit `selectionChange` output fires only on internal mutations (selector / row click / Space / select-all). Consumer writes to the bound signal are reflected on the next change-detection cycle.

### `compareWith`

An equality comparator `(a: unknown, b: unknown) => boolean` used for membership checks. Defaults to `===`. Supply an id-based comparator when rows carry objects:

```ts
protected readonly idEquals = (a: unknown, b: unknown) =>
  (a as { id: number }).id === (b as { id: number }).id;
```

### Space-to-select on a focused grid cell

In `mode="grid"` with `selectionMode` set to `'single'` or `'multiple'`, pressing **Space** on a focused data cell (`event.target === cellHost`) toggles the enclosing row's selection and prevents the default scroll. Space originating from a nested element (e.g. a button inside the cell) is ignored.

### `[forTableRowSelector]`

Decorative per-row affordance (place inside any cell of each `[forTableRow]`). The row owns the announced `aria-selected`, so the selector is `aria-hidden`. Clicking it calls `toggleRowSelection` on the row; a `stopPropagation` prevents the outer row-click handler from double-toggling. Give the row a `[value]` input to make it selectable.

```html
<div forTableRow [value]="row.id">
  <div forTableCell name="sel">
    <span forTableRowSelector>☑</span>
  </div>
  <div forTableCell name="name">{{ row.name }}</div>
</div>
```

### `[forTableSelectAll]`

Interactive header checkbox with tri-state. Reflects `aria-checked` and `data-state` derived from the aggregate selection state across all selectable rows. Clicking (or pressing Space / Enter) selects all when none or some are selected, and clears when all are. No-op outside `'multiple'` mode. Apply on a focusable element:

```html
<div forTableHeaderRow>
  <div forTableHeaderCell name="sel">
    <span forTableSelectAll ariaLabel="Select all rows"></span>
  </div>
  <div forTableHeaderCell name="name">Name</div>
</div>
```

### Minimal multiple-select example

```html
<div
  forTable
  mode="grid"
  selectionMode="multiple"
  selectionBehavior="toggle"
  [(selection)]="selection"
>
  <div role="rowgroup">
    <div forTableHeaderRow>
      <div forTableHeaderCell name="sel">
        <span forTableSelectAll ariaLabel="Select all rows"></span>
      </div>
      <div forTableHeaderCell name="name">Name</div>
    </div>
  </div>
  <div role="rowgroup">
    @for (row of rows(); track row.id) {
    <div forTableRow [value]="row.id">
      <div forTableCell name="sel">
        <span forTableRowSelector></span>
      </div>
      <div forTableCell name="name">{{ row.name }}</div>
    </div>
    }
  </div>
</div>
```

## Sortable headers

`[forTableSortHeader]` turns a `[forTableHeaderCell]` into a sortable affordance. It emits `aria-sort` and fires `sortChange` on activation (click, Enter, Space). **The directive never sorts data** — the consumer reorders their own rows from the `sortChange` payload.

The directive is self-contained: it owns only its own `direction` state. The "one sorted column at a time" guarantee is the consumer's responsibility — hold a single sort descriptor signal and derive each header's `direction` from it:

```html
<div forTableHeaderRow>
  <div
    forTableHeaderCell
    name="name"
    forTableSortHeader
    column="name"
    [direction]="directionFor('name')"
    (sortChange)="onSort($event)"
  >
    Name
  </div>
</div>
```

```ts
protected readonly sort = signal<TableSortDescriptor>({ column: '', direction: 'none' });
protected directionFor(column: string): TableSortDirection {
  return this.sort().column === column ? this.sort().direction : 'none';
}
protected onSort(descriptor: TableSortDescriptor): void {
  this.sort.set(descriptor);
}
protected readonly sortedRows = computed(() => /* the consumer sorts rows() by this.sort() */);
```

The direction cycles `none → ascending → descending → none`. Set `disableClear` to make the cycle skip `none`: `ascending ↔ descending`. When `sortable` is `false` the header is fully inert (no `tabindex`, no `aria-sort`, no-op handlers) — useful when sorting is conditionally enabled. Because the directive coordinates nothing across columns, the single-`sort` descriptor pattern above is what enforces that only one column is sorted at a time.

## Column resizing

`[forTableColumnResizer]` turns a focusable element inside a `[forTableHeaderCell]` into a column-resize handle. It publishes the resolved width as the CSS custom property `--for-table-col-<name>-width` on the table root, so the consumer's layout can apply it. **The directive never lays out columns itself** — wiring `--for-table-col-<name>-width` into `grid-template-columns` (or a `<col>` / cell width in native `<table>` mode) is the consumer's job.

```html
<div
  forTableHeaderRow
  style="grid-template-columns: var(--for-table-col-name-width, 200px) var(--for-table-col-role-width, 200px);"
>
  <div forTableHeaderCell name="name">
    Name
    <button
      forTableColumnResizer
      column="name"
      [(width)]="nameWidth"
      (resizeCommit)="onResize($event)"
      aria-label="Resize Name column"
    ></button>
  </div>
  <div forTableHeaderCell name="role">
    Role
    <button
      forTableColumnResizer
      column="role"
      [(width)]="roleWidth"
      (resizeCommit)="onResize($event)"
      aria-label="Resize Role column"
    ></button>
  </div>
</div>
```

Seed the initial width through the bound signal (`nameWidth = signal(200)`); the directive applies pointer / keyboard deltas on top of it. The same `--for-table-col-<name>-width` variable can be applied to a `<col>` width or an individual cell width in native `<table>` mode.

`data-resizing` (empty string) is present on the handle element while a pointer drag is active — use it to style the resize cursor or highlight the column.

`resizeCommit` fires once per gesture (pointer-up after a drag, each arrow press) with a `{ column, width }` payload — bind it to persist the width. Live updates during a drag come through `[(width)]` / `widthChange`.

Arrow-key resize (`ArrowLeft` / `ArrowRight`) moves the width by `[step]` pixels per press, respecting `[min]` / `[max]`. In RTL, the directions are mirrored.

## Inputs

| Directive                 | Input               | Type                                    | Default        | Description                                                                                                 |
| ------------------------- | ------------------- | --------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `[forTable]`              | `mode`              | `'table' \| 'grid' \| 'treegrid'`       | `'table'`      | ARIA role emitted on the host.                                                                              |
| `[forTable]`              | `ariaLabel`         | `string \| null`                        | `null`         | Reactive accessible label.                                                                                  |
| `[forTable]`              | `dir`               | `'ltr' \| 'rtl' \| null`                | `null`         | Writing direction; resolves ambient when unset.                                                             |
| `[forTable]`              | `rowCount`          | `number`                                | rendered count | True total data-row count for `aria-rowcount`. Ignored in `table` mode.                                     |
| `[forTable]`              | `colCount`          | `number`                                | rendered count | True total column count for `aria-colcount`. Ignored in `table` mode.                                       |
| `[forTable]`              | `selectionMode`     | `'none' \| 'single' \| 'multiple'`      | `'none'`       | Row selection mode.                                                                                         |
| `[forTable]`              | `selectionBehavior` | `'toggle' \| 'replace'`                 | `'toggle'`     | How a row click mutates selection (modifier-aware in `replace` mode).                                       |
| `[forTable]`              | `selection`         | `model<readonly unknown[]>([])`         | `[]`           | Two-way bindable selected row values.                                                                       |
| `[forTable]`              | `compareWith`       | `(a: unknown, b: unknown) => boolean`   | `===`          | Equality comparator for row values. Override for object rows.                                               |
| `[forTableHeaderCell]`    | `name`              | `string` (required)                     | —              | Column identifier, reflected as `data-column`.                                                              |
| `[forTableHeaderCell]`    | `sticky`            | `boolean \| 'end'`                      | `false`        | Sticky edge; reflected as `data-sticky`.                                                                    |
| `[forTableCell]`          | `name`              | `string` (required)                     | —              | Column identifier, reflected as `data-column`.                                                              |
| `[forTableCell]`          | `sticky`            | `boolean \| 'end'`                      | `false`        | Sticky edge; reflected as `data-sticky`.                                                                    |
| `[forTableCell]`          | `disabled`          | `boolean`                               | `false`        | Skipped during navigation; reflects `aria-disabled` / `data-disabled`.                                      |
| `[forTableRow]`           | `value`             | `unknown`                               | `undefined`    | Selection identity for this row. Leave unset for non-selectable rows.                                       |
| `[forTableSelectAll]`     | `ariaLabel`         | `string \| null`                        | `null`         | Accessible label for the select-all checkbox (e.g. `"Select all rows"`).                                    |
| `[forTableSortHeader]`    | `column`            | `string` (required)                     | —              | Column identity included in the `sortChange` payload.                                                       |
| `[forTableSortHeader]`    | `direction`         | `'ascending' \| 'descending' \| 'none'` | `'none'`       | Current sort direction (two-way bindable via `[(direction)]`).                                              |
| `[forTableSortHeader]`    | `disableClear`      | `boolean`                               | `false`        | Skip the `'none'` step: cycle becomes `ascending ↔ descending`.                                             |
| `[forTableSortHeader]`    | `sortable`          | `boolean`                               | `true`         | When `false`, the header is fully inert (no tabindex, no aria-sort).                                        |
| `[forTableColumnResizer]` | `column`            | `string` (required)                     | —              | Column identity; included in the `resizeCommit` payload and the CSS var name.                               |
| `[forTableColumnResizer]` | `width`             | `model<number>()`                       | `undefined`    | Current column width in pixels. Two-way bindable via `[(width)]`. Fires `widthChange` on every live update. |
| `[forTableColumnResizer]` | `min`               | `number`                                | `0`            | Minimum width in pixels.                                                                                    |
| `[forTableColumnResizer]` | `max`               | `number`                                | `Infinity`     | Maximum width in pixels. No upper bound by default.                                                         |
| `[forTableColumnResizer]` | `step`              | `number`                                | `10`           | Pixels applied per `ArrowLeft` / `ArrowRight` press.                                                        |

## CSS hooks

| Token / attribute              | Emitted by                                      | Description                                                                               |
| ------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `--for-table-header-height`    | `[forTable]`                                    | Header row height in px. Updated on resize.                                               |
| `data-mode`                    | `[forTable]`                                    | `'table' \| 'grid' \| 'treegrid'`                                                         |
| `data-column`                  | header / data cell                              | Column name from the `name` input.                                                        |
| `data-sticky`                  | header / data cell                              | `''` (start-edge) or `'end'` when sticky; absent otherwise.                               |
| `data-highlighted`             | `[forTableCell]`                                | Present on the currently roving-focused cell in grid / treegrid mode.                     |
| `aria-rowindex`                | `[forTableRow]`                                 | 1-based row index in the data row set. Absent in table mode.                              |
| `aria-colindex`                | `[forTableCell]`                                | 1-based column index within the row. Absent in table mode.                                |
| `aria-selected`                | `[forTableRow]`                                 | `"true"` / `"false"` (always-emit) when `selectionMode` is not `'none'`.                  |
| `data-selected`                | `[forTableRow]`                                 | Present (`""`) when selected; absent when not. Boolean present/absent hook.               |
| `aria-multiselectable`         | `[forTable]`                                    | `"true"` when `selectionMode="multiple"`; absent otherwise.                               |
| `data-state`                   | `[forTableRowSelector]`                         | `"checked"` or `"unchecked"`. The row owns `aria-selected`; this is decoration.           |
| `aria-checked`                 | `[forTableSelectAll]`                           | `"true"` / `"false"` / `"mixed"` (tri-state).                                             |
| `data-state`                   | `[forTableSelectAll]`                           | `"checked"` / `"unchecked"` / `"indeterminate"`.                                          |
| `aria-sort`                    | `[forTableSortHeader]`                          | `"ascending"` or `"descending"` while sorted; absent (`null`) when unsorted. Truthy-only. |
| `data-sorted`                  | `[forTableSortHeader]`                          | Same value as `aria-sort` — a CSS styling hook (e.g. for a sort arrow glyph).             |
| `--for-table-col-<name>-width` | `[forTable]` (set by `[forTableColumnResizer]`) | Resolved column width in px; apply it to your layout.                                     |
| `data-resizing`                | `[forTableColumnResizer]`                       | Present (`""`) while a pointer drag is active.                                            |
