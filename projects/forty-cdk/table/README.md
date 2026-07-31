# ForTable

A headless data table that decorates a native &lt;table&gt; or a &lt;div&gt; CSS grid with WAI-ARIA table / grid semantics: sticky headers, 2D keyboard navigation, row selection, sortable headers, column resizing and column / row reordering.

The library sets roles, `aria-label`, writing direction, `data-column`, sticky hooks, and (in grid mode) `aria-rowcount` / `aria-colcount` / `aria-rowindex` / `aria-colindex` and roving keyboard navigation. The consumer owns all styles.

## Anatomy

```html
<div forTable mode="grid" ariaLabel="People" selectionMode="multiple">
  <div role="rowgroup">
    <div forTableHeaderRow>
      <div forTableHeaderCell name="sel">
        <span forTableSelectAll ariaLabel="Select all rows"></span>
      </div>
      <div forTableHeaderCell name="name" forTableSortHeader column="name">
        Name
        <button forTableColumnResizer column="name" aria-label="Resize Name column"></button>
      </div>
    </div>
  </div>
  <div role="rowgroup">
    <!-- one [forTableRow] per data row -->
    <div forTableRow [value]="row.id">
      <div forTableCell name="sel"><span forTableRowSelector></span></div>
      <div forTableCell name="name">{{ row.name }}</div>
    </div>
  </div>
</div>
```

Opt-in companions compose on the same elements: `[forTableVirtualized]` on `[forTable]` for windowed rows, and `[forTableColumnReorder]` / `[forTableRowReorder]` on the header row / data rowgroup for drag reordering.

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

## `<div>` mode

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

## Declarative columns (`ForColumnDef` + `<for-table-body>`)

Hand-writing every cell in the header row **and** the data row keeps the two in sync by hand and
smears a single column across several places. The optional `[forColumnDef]` + `<for-table-body>`
layer stamps both rows out of one column definition, and carries the row variants, interleaved
placeholders, whole-row navigation lists, measured row heights, and per-datum row styling built on
top of it. It is additive: the raw primitives above keep working unchanged, and a table that never
imports `ForTableBody` never bundles it.

→ **[Table: declarative columns](../../../docs/table-declarative-columns.md)**

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

## Grid mode

`mode="grid"` (or `mode="treegrid"`) turns the header **and** data cells into a single-tab-stop roving group with 2D keyboard navigation. The header row is the grid's first row: `Tab` reaches the whole grid once, and Arrow keys move focus between cells and cross between the header row and the body. `Home` / `End` jump to the first / last cell of the current row; `Ctrl+Home` / `Ctrl+End` jump to the first / last cell of the entire grid; `PageUp` / `PageDown` page up / down by one screenful of rows (the rendered row count; in a virtualized grid, the visible window) while keeping the current column — they do **not** jump to the grid ends. All horizontal movement is RTL-mirrored when the resolved writing direction is `rtl`. Disabled cells (set via the cell's `disabled` input) are skipped during navigation.

Because the header row **is** the grid's first row, `Ctrl+Home` lands on the first **header** cell whenever the header joins the roving grid, and one `ArrowDown` moves into the first data cell. `ArrowUp` from the first data row crosses up into the header cell of the same column, and `PageUp` from within the first screenful of data rows clamps to the header row for the same reason. All three hold identically in a virtualized grid, which also scrolls the virtual window back to row 0 so the grid is never left focused on its header while the window sits at the bottom of the dataset. When the header does not join the grid (`mode="table"`, or an incomplete header row), `Ctrl+Home` lands on the first data cell instead and `ArrowUp` / `PageUp` stop there.

`Enter` or `F2` on a focused cell that contains an interactive widget moves focus **into** that widget (cell-entry mode); `Escape` returns focus to the owning cell. While focus is inside a cell's widget, Arrow keys act on the widget, not the grid.

The root emits `aria-rowcount` and `aria-colcount`. Per ARIA 1.2 and the APG Data Grid example, the header row counts as the grid's first row: it carries `aria-rowindex="1"`, the first data row is `aria-rowindex="2"`, and `aria-rowcount` includes the header row (defaulting to the rendered data-row count + 1). Override the data-row total for server-paged or virtualized tables via the `rowCount` input (the header offset is still added); override the column total via `colCount`. Data cells emit `aria-colindex` (1-based) and `data-highlighted` on the currently focused cell; header cells joining the roving grid emit `aria-colindex` too.

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

## Treegrid mode

`mode="treegrid"` sets `role="treegrid"` on the root. Rows are a flat sibling list in the DOM; hierarchy is expressed through ARIA attributes, not DOM nesting.

- **`[level]`** — 1-based tree depth, reflected as `aria-level`. Default `1`.
- **`[expandable]`** — marks a row as a parent; emits `aria-expanded="true"|"false"` and `data-state="open"|"closed"`. Leaf rows emit neither.
- **`[(expanded)]`** — two-way bindable array of open parent-row values (keyed by row `[value]`). Use `compareWith` for object values.
- **`aria-posinset` / `aria-setsize`** — auto-recomputed from the rendered flat list on every expand/collapse.
- **ArrowRight** — expands a collapsed parent (RTL: collapses); if already expanded or the row is a leaf, falls through to grid cell navigation.
- **ArrowLeft** — collapses an expanded parent (RTL: expands); otherwise navigates left.
- Consumer mounts/unmounts child rows with `@if` driven by `expanded()`. A `#r="forTableRow"` template ref exposes `r.toggleExpanded()` for pointer-driven expand buttons.

```html
<div forTable mode="treegrid" [(expanded)]="expanded">
  <div role="rowgroup">
    @for (row of visibleRows(); track row.id) {
    <div
      forTableRow
      #r="forTableRow"
      [value]="row.id"
      [level]="row.level"
      [expandable]="row.expandable"
    >
      <div forTableCell name="name">
        @if (row.expandable) {
        <button type="button" (click)="r.toggleExpanded()">▶</button>
        } {{ row.name }}
      </div>
    </div>
    }
  </div>
</div>
```

```ts
readonly expanded = signal<readonly unknown[]>([]);
readonly visibleRows = computed(() => {
  const openIds = this.expanded() as readonly string[];
  return this.allRows.filter((row) => row.parentId === null || openIds.includes(row.parentId));
});
```

Style hooks:

```css
[forTableRow][data-state='open'] {
  background: #f0fff0;
}
[forTableRow][data-state='closed'] {
  background: #fff0f0;
}
[forTableRow][aria-level='2'] {
  padding-left: 2rem;
}
```

## Row selection

Add `selectionMode` to `[forTable]` to enable row selection. Use `[forTableRowSelector]` for an accessible per-row selection checkbox and `[forTableSelectAll]` in the header for a tri-state select-all checkbox.

### `selectionMode`

- `'none'` (default) — selection is disabled. No `aria-selected` or `aria-multiselectable` is emitted.
- `'single'` — at most one row can be selected. Selectable rows emit `aria-selected="true"` or `"false"`.
- `'multiple'` — any number of rows can be selected. In `grid` / `treegrid` mode the root emits `aria-multiselectable="true"`; in `table` mode it is never emitted (WAI-ARIA does not permit `aria-multiselectable` on `role="table"`).

Only rows carrying a `[value]` are selectable and emit `aria-selected`. A row without a `[value]` (e.g. a full-span variant row — group header, separator, summary) is non-selectable by contract and emits no `aria-selected`, even when `selectionMode` is not `'none'`.

### `selectionBehavior`

Controls how a row click (on the row or on a cell) mutates the selection:

- `'toggle'` (default) — clicking a row always flips its selected state.
- `'replace'` — clicking a row replaces the selection with that single row. Modifier keys in `'multiple'` mode: **Ctrl/Cmd-click** toggles the clicked row without clearing others; **Shift-click** extends a range from the last anchor to the clicked row.

**Interactive content in a data cell owns its click.** A click on a per-row action `<button>` (or an `<a href>`, `<input>`, `<select>`, `<textarea>`, `<summary>`, or `contenteditable` descendant) runs that control **without also** changing the row's selection — so a selectable table with a trailing actions column behaves as expected, and you never have to `stopPropagation()` on every control. A plain click anywhere else on the row — cell text, the gaps between cells, the row itself — still selects, including the `Ctrl`/`Cmd`/`Shift` modifier behaviour above. `[forTableRowSelector]` is unaffected. This mirrors the whole-row-activation guard in [Whole-row navigation lists](../../../docs/table-declarative-columns.md#whole-row-navigation-lists).

### `[(value)]`

A two-way-bindable `model<readonly T[]>()`. `ForTable<T>` infers the row-value type `T` from this binding (`unknown` when unbound), so `compareWith`, `selectableValues`, and the selection methods specialize accordingly. Single mode keeps 0–1 entries. The implicit `valueChange` output fires only on internal mutations (selector / row click / Space / select-all). Consumer writes to the bound signal are reflected on the next change-detection cycle.

### `compareWith`

An equality comparator `(a: T, b: T) => boolean` used for membership checks. Defaults to `===`. Supply an id-based comparator when rows carry objects:

```ts
protected readonly idEquals = (a: Person, b: Person) => a.id === b.id;
```

### Space-to-select on a focused grid cell

In `mode="grid"` with `selectionMode` set to `'single'` or `'multiple'`, pressing **Space** on a focused data cell (`event.target === cellHost`) toggles the enclosing row's selection and prevents the default scroll. Space originating from a nested element (e.g. a button inside the cell) is ignored.

### `[forTableRowSelector]`

Accessible per-row selection checkbox (place inside any cell of each `[forTableRow]`). Renders `role="checkbox"` and reflects `aria-checked` plus `data-state="checked" | "unchecked"`. In `mode="table"` it is the focusable keyboard selection path — `Tab` to it, then `Space` / `Enter` to toggle. In `grid` / `treegrid` mode it stays out of the roving tab order (`tabindex="-1"`) and selection is driven from the cell (`Space`). Clicking (or Space / Enter) calls `toggleRowSelection` on the row; a `stopPropagation` prevents the outer row-click handler from double-toggling. The enclosing row still owns the announced `aria-selected`. Give the selector an accessible name via `[ariaLabel]`, and give the row a `[value]` input to make it selectable.

```html
<div forTableRow [value]="row.id">
  <div forTableCell name="sel">
    <span forTableRowSelector [ariaLabel]="'Select ' + row.name">☑</span>
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

### Total-aware aggregates under virtualization: `[selectableValues]`

By default the select-all tri-state, `toggleSelectAll`, and Shift-click range selection compute against the **registered (rendered)** rows. Under `[forTableVirtualized]` only the windowed rows are registered, so these aggregates would otherwise see only the visible slice — select-all would report "all" once every _visible_ row is selected, and a range could not span unmounted rows.

Supply the full ordered set of selectable values via `[selectableValues]` so the aggregates compute against the true dataset instead of the window:

- The select-all tri-state reflects the current selection vs. the full set, so it stays correct across scrolling.
- `toggleSelectAll()` selects / clears every supplied value.
- Shift-click range resolves against the supplied order, so a range can span rows that are not currently mounted.

Per-row selection (`[forTableRowSelector]`, row click, Space) is unaffected — it persists in the bound `[(value)]` array regardless of mount state. Leave `[selectableValues]` unset (`null`, the default) for non-virtualized tables to keep the registered-rows behaviour.

```html
<div
  forTable
  forTableVirtualized
  mode="grid"
  selectionMode="multiple"
  [rowCount]="people().length"
  [selectableValues]="peopleIds()"
  [(value)]="selection"
>
  <!-- header with [forTableSelectAll], windowed rows with [forTableRowSelector] -->
</div>
```

```ts
protected readonly peopleIds = computed(() => this.people().map((p) => p.id));
```

### Minimal multiple-select example

```html
<div forTable mode="grid" selectionMode="multiple" selectionBehavior="toggle" [(value)]="selection">
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

The direction cycles `none → ascending → descending → none`. Set `disableClear` to make the cycle skip `none`: `ascending ↔ descending`. Set `firstClickDirection="descending"` to make a freshly activated column start descending: `none → descending → ascending → none` (and with `disableClear`, `none → descending → ascending → descending` — the descending-first-with-toggle behavior a single always-active sort descriptor needs). When `sortable` is `false` the header is fully inert (no `tabindex`, no `aria-sort`, no-op handlers) — useful when sorting is conditionally enabled. In `mode="table"` a sortable header is a `tabindex="0"` tab stop; in `mode="grid"` / `mode="treegrid"` the header cell owns the roving composite tab stop instead, so the sort header adds no separate `tabindex` (the `[forTableHeaderCell]` is the single owner of the host `tabindex`). Because the directive coordinates nothing across columns, the single-`sort` descriptor pattern above is what enforces that only one column is sorted at a time.

In `mode="grid"` / `mode="treegrid"`, a sortable header cell reflects `data-sortable` and takes over the cell's `Enter` key: `Enter` toggles the sort and keeps focus on the cell, while `F2` remains the APG cell-entry key that moves focus into the cell's first widget (e.g. a `[forTableColumnResizer]`). On a non-sortable header cell (no `data-sortable`), `Enter` keeps its default cell-entry behavior. This keeps a sortable + resizable header from both sorting and dropping focus onto the resize handle on a single `Enter`.

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

`Escape` (or a `pointercancel`) mid-drag restores the pre-drag width through `[(width)]` and emits no `resizeCommit`. Unmounting the handle mid-drag — the column is dropped, or `resizable` is toggled off — reverts too, but the destroyed `[(width)]` model can no longer emit, so the pre-drag width is reported through the `[widthRevert]` callback instead. Bind it as a function reference when you persist widths and columns can disappear during a gesture:

```html
<button
  forTableColumnResizer
  column="name"
  [(width)]="nameWidth"
  [widthRevert]="onWidthRevert"
  aria-label="Resize Name column"
></button>
```

```ts
readonly onWidthRevert = ({ column, width }: TableResizeDescriptor): void => {
  this.persistedWidths.update((widths) => ({ ...widths, [column]: width }));
};
```

`<for-table-body>` wires this internally: a stamped handle destroyed mid-drag folds its pre-drag width back into `[(columnWidths)]`, so the declarative layer needs no extra binding.

### Size-to-content (auto-fit)

Opt in with `[autoFit]` to add the "double-click the handle to fit the column to its content" gesture. When set, a `dblclick` on the handle measures the widest natural width across the column's data cells (resolved through the table context, browser-only), clamps it to `[min]` / `[max]`, applies it as the new `[(width)]`, and emits `resizeCommit` — exactly like a drag or arrow press. Unset (default), `dblclick` is a no-op and the resize behaviour is unchanged.

```html
<button
  forTableColumnResizer
  column="name"
  autoFit
  [(width)]="nameWidth"
  (resizeCommit)="onResize($event)"
  aria-label="Resize Name column"
></button>
```

The same action is callable imperatively through the directive's `exportAs="forTableColumnResizer"` — e.g. a "Fit to content" item in a column menu. `fitToContent()` returns the applied width:

```html
<button forTableColumnResizer column="name" #resizer="forTableColumnResizer" ...></button>
<button (click)="resizer.fitToContent()">Fit column to content</button>
```

#### Include the header label

By default auto-fit measures the column's **data cells only** — a long header over narrow data (a `Department` column of short codes) can end up truncated. Add `[fitIncludesHeader]` to fit to `max(header label, …data cells)` instead. Mark the header's label text with a sibling `[forTableColumnLabel]` so the resize handle and any sort affordance are excluded from the measurement — the directive measures that marked element, making no assumption about the header's DOM structure:

```html
<th forTableHeaderCell name="dept">
  <span forTableColumnLabel>Department</span>
  <button
    forTableColumnResizer
    column="dept"
    autoFit
    fitIncludesHeader
    [(width)]="deptWidth"
    aria-label="Resize Department column"
  ></button>
</th>
```

Without a `[forTableColumnLabel]` marker present, `[fitIncludesHeader]` degrades gracefully to the data-cells-only behaviour. Default (`fitIncludesHeader` unset) is unchanged — the header is ignored.

## Column & row reordering

`[forTableColumnReorder]` and `[forTableRowReorder]` are opt-in companion directives that compose
the **drag-drop** primitive to make table headers and data rows reorderable, each wrapping
`[forDropList]` via `hostDirectives` so the whole drag-drop surface stays available. **The table
never mutates the consumer's data** — reorder handlers apply `moveItemInArray` to a local signal.

→ **[Table: column & row reordering](../../../docs/table-reordering.md)**

## Virtualized rows

`[forTableVirtualized]` is opt-in and works only with `<div role>` grid mode: a native `<table>`
cannot omit rows mid-body without the browser recalculating every column width. Set `[rowCount]` on
`[forTable]` to the **true total** so `aria-rowcount` and the window size both stay honest.
`@tanstack/virtual-core` loads only when you import `ForTableVirtualized`.

→ **[Table: virtualized rows](../../../docs/table-virtualized-rows.md)**

## API

### `ForTable`

| Property            | Type                               | Description                                                                                                                                                                                                                                                        |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mode`              | `'table' \| 'grid' \| 'treegrid'`  | ARIA role emitted on the host.<br>**Default:** `'table'`                                                                                                                                                                                                           |
| `ariaLabel`         | `string \| null`                   | Reactive accessible label.<br>**Default:** `null`                                                                                                                                                                                                                  |
| `dir`               | `'ltr' \| 'rtl' \| null`           | Writing direction; resolves ambient when unset.<br>**Default:** `null`                                                                                                                                                                                             |
| `rowCount`          | `number`                           | True total data-row count for `aria-rowcount`. Optional with `<for-table-body>` (its dataset length is used); bind it only for a server-known total larger than the loaded rows. Ignored in `table` mode.<br>**Default:** body dataset length, else rendered count |
| `colCount`          | `number`                           | True total column count for `aria-colcount`. Ignored in `table` mode.<br>**Default:** rendered count                                                                                                                                                               |
| `selectionMode`     | `'none' \| 'single' \| 'multiple'` | Row selection mode.<br>**Default:** `'none'`                                                                                                                                                                                                                       |
| `selectionBehavior` | `'toggle' \| 'replace'`            | How a row click mutates selection (modifier-aware in `replace` mode).<br>**Default:** `'toggle'`                                                                                                                                                                   |
| `value`             | `model<readonly T[]>([])`          | Two-way bindable selected row values. Infers the row-value type `T`.<br>**Default:** `[]`                                                                                                                                                                          |
| `compareWith`       | `(a: T, b: T) => boolean`          | Equality comparator for row values. Override for object rows.<br>**Default:** `===`                                                                                                                                                                                |
| `selectableValues`  | `readonly T[] \| null`             | Full ordered set of selectable values for total-aware aggregates under virtualization; `null` uses the rendered rows.<br>**Default:** `null`                                                                                                                       |
| `expanded`          | `model<readonly T[]>([])`          | Two-way bindable open parent-row values for `mode="treegrid"`. Ignored in other modes.<br>**Default:** `[]`                                                                                                                                                        |

### `ForTableHeaderCell`

| Property | Type                | Description                                                      |
| -------- | ------------------- | ---------------------------------------------------------------- |
| `name`   | `string` (required) | Column identifier, reflected as `data-column`.<br>**Default:** — |
| `sticky` | `boolean \| 'end'`  | Sticky edge; reflected as `data-sticky`.<br>**Default:** `false` |

### `ForTableCell`

| Property   | Type                | Description                                                                                    |
| ---------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `name`     | `string` (required) | Column identifier, reflected as `data-column`.<br>**Default:** —                               |
| `sticky`   | `boolean \| 'end'`  | Sticky edge; reflected as `data-sticky`.<br>**Default:** `false`                               |
| `disabled` | `boolean`           | Skipped during navigation; reflects `aria-disabled` / `data-disabled`.<br>**Default:** `false` |

### `ForTableRow`

| Property     | Type      | Description                                                                                           |
| ------------ | --------- | ----------------------------------------------------------------------------------------------------- |
| `value`      | `unknown` | Selection identity for this row. Leave unset for non-selectable rows.<br>**Default:** `undefined`     |
| `level`      | `number`  | 1-based tree depth for `aria-level` in `mode="treegrid"`. Ignored in other modes.<br>**Default:** `1` |
| `expandable` | `boolean` | Marks this row as an expandable parent; emits `aria-expanded` + `data-state`.<br>**Default:** `false` |

### `ForTableSelectAll`

| Property    | Type             | Description                                                                                     |
| ----------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| `ariaLabel` | `string \| null` | Accessible label for the select-all checkbox (e.g. `"Select all rows"`).<br>**Default:** `null` |

### `ForTableSortHeader`

| Property              | Type                                    | Description                                                                                                                  |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `column`              | `string` (required)                     | Column identity included in the `sortChange` payload.<br>**Default:** —                                                      |
| `direction`           | `'ascending' \| 'descending' \| 'none'` | Current sort direction (two-way bindable via `[(direction)]`).<br>**Default:** `'none'`                                      |
| `disableClear`        | `boolean`                               | Skip the `'none'` step: cycle becomes `ascending ↔ descending`.<br>**Default:** `false`                                      |
| `firstClickDirection` | `'ascending' \| 'descending'`           | Direction a previously-unsorted column enters on its first activation (the `'none' → ?` step).<br>**Default:** `'ascending'` |
| `sortable`            | `boolean`                               | When `false`, the header is fully inert (no tabindex, no aria-sort).<br>**Default:** `true`                                  |

### `ForTableColumnResizer`

| Property            | Type                                                         | Description                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `column`            | `string` (required)                                          | Column identity; included in the `resizeCommit` payload and the CSS var name.<br>**Default:** —                                                                                                                                               |
| `width`             | `model<number>()`                                            | Current column width in pixels. Two-way bindable via `[(width)]`. Fires `widthChange` on every live update.<br>**Default:** —                                                                                                                 |
| `min`               | `number`                                                     | Minimum width in pixels.<br>**Default:** `0`                                                                                                                                                                                                  |
| `max`               | `number`                                                     | Maximum width in pixels. No upper bound by default.<br>**Default:** `Infinity`                                                                                                                                                                |
| `step`              | `number`                                                     | Pixels applied per `ArrowLeft` / `ArrowRight` press.<br>**Default:** `10`                                                                                                                                                                     |
| `autoFit`           | `boolean`                                                    | Opt-in: `dblclick` on the handle fits the column to its content width via `fitToContent()`. No behaviour change when unset.<br>**Default:** `false`                                                                                           |
| `fitIncludesHeader` | `boolean`                                                    | Opt-in: auto-fit also accounts for the header label (marked with a sibling `[forTableColumnLabel]`), fitting to `max(header label, …data cells)`. Degrades to data-cells-only with no marker present.<br>**Default:** `false`                 |
| `widthRevert`       | `((descriptor: TableResizeDescriptor) => void) \| undefined` | Teardown-only revert callback, bound as a function reference. Called with the pre-drag width when the handle is destroyed mid-drag, where `[(width)]` can no longer emit. Silent on the `Escape` / `pointercancel` reverts.<br>**Default:** — |

### Data attributes

| Token / attribute              | Emitted by                                      | Values / description                                                                                                                                |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--for-table-header-height`    | `[forTable]`                                    | Header row height in px. Updated on resize.                                                                                                         |
| `data-mode`                    | `[forTable]`                                    | `'table' \| 'grid' \| 'treegrid'`                                                                                                                   |
| `data-column`                  | header / data cell                              | Column name from the `name` input.                                                                                                                  |
| `data-sticky`                  | header / data cell                              | `''` (start-edge) or `'end'` when sticky; absent otherwise.                                                                                         |
| `data-highlighted`             | header / data cell                              | Present on the currently roving-focused cell in grid / treegrid mode.                                                                               |
| `aria-expanded`                | `[forTableRow]`                                 | `"true"` / `"false"` (always-emit) on expandable rows in `treegrid` mode; absent on leaves.                                                         |
| `data-state`                   | `[forTableRow]`                                 | `"open"` / `"closed"` on expandable rows in `treegrid` mode; absent on leaves.                                                                      |
| `aria-level`                   | `[forTableRow]`                                 | 1-based depth in `treegrid` mode; absent otherwise.                                                                                                 |
| `aria-posinset`                | `[forTableRow]`                                 | 1-based position among same-level siblings in `treegrid` mode; absent otherwise.                                                                    |
| `aria-setsize`                 | `[forTableRow]`                                 | Total same-level sibling count in `treegrid` mode; absent otherwise.                                                                                |
| `aria-rowindex`                | `[forTableHeaderRow]`                           | `"1"` in grid / treegrid mode (the header is the grid's first row); absent in table mode.                                                           |
| `aria-rowindex`                | `[forTableRow]`                                 | 1-based row index counting the header row (first data row is `2`). Absent in table mode.                                                            |
| `aria-colindex`                | header / data cell                              | 1-based column index within the row. Absent in table mode.                                                                                          |
| `aria-selected`                | `[forTableRow]`                                 | `"true"` / `"false"` (always-emit) on selectable rows (with a `[value]`) when `selectionMode` is not `'none'`; absent on rows without a `[value]`.  |
| `data-selected`                | `[forTableRow]`                                 | Present (`""`) when selected; absent when not. Boolean present/absent hook.                                                                         |
| `aria-multiselectable`         | `[forTable]`                                    | `"true"` when `selectionMode="multiple"` in `grid` / `treegrid` mode; absent otherwise (including `table` mode, where `role="table"` forbids it).   |
| `aria-checked`                 | `[forTableRowSelector]`                         | `"true"` / `"false"` (always-emit) reflecting the row's selection. The selector is `role="checkbox"`; the enclosing row still owns `aria-selected`. |
| `tabindex`                     | `[forTableRowSelector]`                         | `"0"` in table mode (focusable keyboard selection path); `"-1"` in grid / treegrid mode (yields to the roving grid).                                |
| `data-state`                   | `[forTableRowSelector]`                         | `"checked"` or `"unchecked"`. Styling hook alongside `aria-checked`.                                                                                |
| `aria-checked`                 | `[forTableSelectAll]`                           | `"true"` / `"false"` / `"mixed"` (tri-state).                                                                                                       |
| `data-state`                   | `[forTableSelectAll]`                           | `"checked"` / `"unchecked"` / `"indeterminate"`.                                                                                                    |
| `aria-sort`                    | `[forTableSortHeader]`                          | `"ascending"` or `"descending"` while sorted; absent (`null`) when unsorted. Truthy-only.                                                           |
| `data-sorted`                  | `[forTableSortHeader]`                          | Same value as `aria-sort` — a CSS styling hook (e.g. for a sort arrow glyph).                                                                       |
| `data-sortable`                | `[forTableSortHeader]`                          | Present (`""`) while `sortable`; absent otherwise. Styling hook, and the marker that makes `Enter` sort (not enter) a grid header cell.             |
| `--for-table-col-<name>-width` | `[forTable]` (set by `[forTableColumnResizer]`) | Resolved column width in px; apply it to your layout.                                                                                               |
| `data-resizing`                | `[forTableColumnResizer]`                       | Present (`""`) while a pointer drag is active.                                                                                                      |

## Wrapping the root

Composing with `hostDirectives: [ForTable]` needs nothing special — a host directive brings its own providers to the element.

**Subclassing** the root does: Angular does not inherit a directive's `providers`, so a subclass carrying its own `@Directive` metadata replaces the array wholesale. `[forTable]` provides an internal registry that its own constructor injects and every piece resolves through, and that registry is deliberately not exported — so a subclass with a hand-written provider list fails to construct (`NG0201`). Spread `provideForTable` instead, which installs the whole set and keeps the wrapper in step when the library changes it:

```ts
import { Directive, input } from '@angular/core';
import { ForTable, provideForTable } from 'forty-cdk/table';

@Directive({
  selector: '[myTable]',
  exportAs: 'myTable',
  providers: provideForTable(MyTable),
  host: { '[style.--my-table-cols]': 'columns() || null' },
})
export class MyTable extends ForTable {
  readonly columns = input<string>('');
}
```

The argument is the subclass, so the public `FOR_TABLE_CONTEXT` aliases it and an advanced consumer injecting the context reaches your instance. Add `{ provide: ForTable, useExisting: MyTable }` alongside if you also want `inject(ForTable)` to resolve.

The rest of the wrapper story — what a wrapper must not swallow, and the plain re-provide every other composed root needs — is in [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).

## Wrapping the declarative body

`<for-table-body>` does not content-query its building blocks: every `[forColumnDef]` / `[forRowDef]` / `[forColumnDragPlaceholder]` / `[forPlaceholderCellDefault]` **registers itself** with the surrounding def registry through DI at construction, and registrations are exposed in document order. That makes the two authoring shapes a design system layers on top expressible, and both are recipes rather than new API surface:

- **A preset column component** (`<ds-text-column name="code" [header]="…" [value]="…" />` collapsing the recurring header / data / placeholder block into one line) needs **nothing extra**. Element DI follows the declaration tree, so a preset host declared inside the body's tags lets the def in the preset's own **view** resolve the body's registry — a content query never could, because a view is not content.
- **A scaffold wrapper table** (`<ds-data-table>` whose template owns the `[forTable]` root, the body and the shared row defs, with consumer columns arriving through `<ng-content>`) needs one seam: those projected defs are content of the wrapper, not of the inner body, so the wrapper declares `providers: provideForTableDefRegistry()` and binds `inject(FOR_TABLE_DEF_REGISTRY)` to the body's `[defs]`. The wrapper's own baked-in defs go next to the projected ones, outside the `<for-table-body>` element, so they reach the same registry.

A def with no reachable registry throws a `[forty-cdk/table]` error (it used to be silently inert), and subclassing `ForTableBody` is not a supported wrapping shape — compose it in a wrapper's template.

→ Both recipes in full: **[Table: declarative columns — Wrapping the declarative body](../../../docs/table-declarative-columns.md#wrapping-the-declarative-body)**

## Accessibility

Implements the [WAI-ARIA Table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/) and the [WAI-ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

- **Label the table** via the reactive `[ariaLabel]` input or a native `aria-labelledby` pointing at a visible caption / heading.
- **`mode="table"`** sets `role="table"` with semantic `role="columnheader"` / `role="cell"` cells. Screen readers announce row and column counts from native semantics.
- **`mode="grid"`** sets `role="grid"` with `role="gridcell"` cells. The root emits `aria-rowcount` / `aria-colcount`; the header row and every data row emit `aria-rowindex` (the header row is `1`, so data rows start at `2` and `aria-rowcount` counts the header); header and data cells emit `aria-colindex`. Header and body share one composite roving tab stop; `PageUp` / `PageDown` page by rows, and `Enter` / `F2` enter an interactive cell's widget (`Escape` exits). Override `[rowCount]` / `[colCount]` for server-paged or virtualized datasets so screen readers announce correct totals.
- **`mode="treegrid"`** sets `role="treegrid"`. Expandable rows emit `aria-expanded="true"|"false"` and `aria-level` / `aria-posinset` / `aria-setsize`; leaf rows emit none of these, matching APG "end nodes lack `aria-expanded`".
- **Row selection** (`selectionMode` not `'none'`): each selectable row (one with a `[value]`) emits `aria-selected="true"|"false"`; rows without a `[value]` (full-span variant rows) are non-selectable and emit no `aria-selected`; in `grid` / `treegrid` mode `'multiple'` adds `aria-multiselectable="true"` on the root (never in `table` mode, where `role="table"` forbids it). `[forTableSelectAll]` emits `aria-checked` in tri-state.
- **Sortable headers** emit `aria-sort="ascending"|"descending"` while sorted; the attribute is absent (not `"none"`) when unsorted, per APG.
- **Column resizers** must be focusable elements with an `aria-label` naming the column — e.g. `aria-label="Resize Name column"`.
- **Disabled cells** use `aria-disabled="true"` + `data-disabled`; they are skipped during grid navigation but remain focusable, consistent with the APG disabled pattern.
- All horizontal keyboard navigation is RTL-mirrored when the resolved writing direction is `rtl`.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). Key your CSS off the `data-*` attributes and CSS custom properties listed under [Data attributes](#data-attributes).
