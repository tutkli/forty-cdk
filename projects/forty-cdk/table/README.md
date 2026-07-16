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
smears a single column across several places. The optional ergonomic layer lets you author one
`[forColumnDef]` per column and have `<for-table-body>` stamp the header row and one data row per item
out of the same cell primitives. Place it inside a `[forTable]` in `mode="grid"`; it is additive — the
raw primitives above keep working unchanged, and a table that never imports `ForTableBody` never
bundles it.

```html
<div forTable mode="grid" ariaLabel="People" selectionMode="multiple">
  <for-table-body [rows]="rows()" [rowKey]="rowKey" [sort]="sort()" (sortChange)="sort.set($event)">
    <!-- selection column: drop the raw selector primitives into the cell templates -->
    <ng-container forColumnDef="sel" sticky width="48px">
      <ng-template forHeaderCell
        ><span forTableSelectAll ariaLabel="Select all"></span
      ></ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>
        <span forTableRowSelector></span>
      </ng-template>
    </ng-container>

    <ng-container forColumnDef="name" sticky sortable resizable resizeAriaLabel="Resize Name">
      <ng-template forHeaderCell>Name</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row let-i="index"
        >{{ row.name }}</ng-template
      >
    </ng-container>

    <ng-container forColumnDef="status" width="140px">
      <ng-template forHeaderCell>Status</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.status }}</ng-template>
    </ng-container>
  </for-table-body>
</div>
```

- **`<for-table-body>`** takes `[rows]` (already sorted / filtered / paged by you — BYO-data),
  optional `[rowKey]` (row identity used for `@for` tracking **and** each row's selection `[value]`),
  optional `[displayedColumns]` (which columns render, in order; defaults to declaration order), and
  `[loading]` / `[placeholderRows]` (render `forPlaceholderCell` skeletons). It **owns
  `grid-template-columns`**: each column contributes its `[width]`, falling back to the published
  `--for-table-col-<name>-width` resize var — so a resized column drives its own track with no glue.
- **Auto-wired from per-column flags:** `sortable` wires `[forTableSortHeader]` (the body derives each
  header's direction from its `[sort]` input and re-emits `(sortChange)`), and `resizable` wires
  `[forTableColumnResizer]` with `autoFit` (re-emitted through `(resizeCommit)`; give `resizeAriaLabel`
  so the handle is named). The sort and width descriptors stay yours to apply.
- **Consumer-placed in templates:** selection (`[forTableRowSelector]` / `[forTableSelectAll]`) and any
  interactive widget go straight into the cell templates. Row-context primitives resolve their
  `[forTableRow]` because the body stamps content with the cell's own injector.
- **Typing `let-row`:** bind `[forDataCellRow]` to the same array you pass to `[rows]` — it is read only
  for type inference, so `let-row` is typed as your row type.

`<for-table-body>`'s host is `display: contents`, so it adds no box between `[forTable]` and its rows;
all visual styling stays yours off the same `data-*` / role hooks the raw primitives emit. Column
**reordering** through the declarative layer is not part of this first cut — use the raw primitives for
that today.

### Virtualized rows

Add `[forTableVirtualized]` to the same `[forTable]` element and the body switches to windowed rendering
automatically — it reads the published window off the table context (so `forty-cdk/table` still never
imports the virtualization core), mounts only the visible slice, sizes its rowgroup to the full scroll
height, and absolutely positions each row. Pass the **whole dataset** to `[rows]` and the true total to
`[rowCount]`; there is no `#v` reference, manual sizer, `@for` window, or `[virtualIndex]` binding.
Fixed-size rows only — set the row height in CSS; measured / dynamic heights stay on the raw
`[forTableRow]` path.

```html
<div
  class="scroll-root"
  forTable
  forTableVirtualized
  mode="grid"
  ariaLabel="People"
  [rowCount]="rows().length"
  [estimateRowSize]="44"
>
  <for-table-body [rows]="rows()" [rowKey]="rowKey">
    <ng-container forColumnDef="id" width="80px">
      <ng-template forHeaderCell>#</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.id }}</ng-template>
    </ng-container>
    <ng-container forColumnDef="name">
      <ng-template forHeaderCell>Name</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
    </ng-container>
  </for-table-body>
</div>
```

```css
.scroll-root {
  height: 400px;
  overflow: auto;
  position: relative;
}
.scroll-root [forTableHeaderRow] {
  position: sticky;
  top: 0;
}
.scroll-root [forTableRow] {
  height: 44px;
}
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

## Grid mode

`mode="grid"` (or `mode="treegrid"`) turns the header **and** data cells into a single-tab-stop roving group with 2D keyboard navigation. The header row is the grid's first row: `Tab` reaches the whole grid once, and Arrow keys move focus between cells and cross between the header row and the body. `Home` / `End` jump to the first / last cell of the current row; `Ctrl+Home` / `Ctrl+End` jump to the first / last cell of the entire grid; `PageUp` / `PageDown` page up / down by one screenful of rows (the rendered row count; in a virtualized grid, the visible window) while keeping the current column — they do **not** jump to the grid ends. All horizontal movement is RTL-mirrored when the resolved writing direction is `rtl`. Disabled cells (set via the cell's `disabled` input) are skipped during navigation.

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

Add `selectionMode` to `[forTable]` to enable row selection. Use `[forTableRowSelector]` for a per-row decorative affordance and `[forTableSelectAll]` in the header for a tri-state select-all checkbox.

### `selectionMode`

- `'none'` (default) — selection is disabled. No `aria-selected` or `aria-multiselectable` is emitted.
- `'single'` — at most one row can be selected. Rows emit `aria-selected="true"` or `"false"`.
- `'multiple'` — any number of rows can be selected. The root emits `aria-multiselectable="true"`.

### `selectionBehavior`

Controls how a row click (on the row or on a cell) mutates the selection:

- `'toggle'` (default) — clicking a row always flips its selected state.
- `'replace'` — clicking a row replaces the selection with that single row. Modifier keys in `'multiple'` mode: **Ctrl/Cmd-click** toggles the clicked row without clearing others; **Shift-click** extends a range from the last anchor to the clicked row.

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

`[forTableColumnReorder]` and `[forTableRowReorder]` are opt-in companion directives that compose the **drag-drop** primitive to make table headers and data rows reorderable. Each wraps `[forDropList]` via `hostDirectives`, so every drag-drop capability — `[forDraggable]`, `[forDragHandle]`, `[forDragPreview]`, `[forDragPlaceholder]`, FLIP animations, live announce, keyboard and pointer drag — is available to the consumer exactly as with a standalone drop list. **The table never mutates the consumer's data.** Reorder handlers apply `moveItemInArray` to a local signal.

### Column reordering

Apply `[forTableColumnReorder]` on the `[forTableHeaderRow]` element and add `[forDraggable] [dragData]="col"` to each header cell. The wrapped list defaults to `orientation="horizontal"` (a column reorder is always along the row axis), so no `orientation` binding is needed. Bind `orientation="vertical"` to override for the rare case.

`columnReorder` fires once per committed drop (pointer or keyboard) with `{ from, to, columns }`. Apply `columns` directly to your column-name signal, or use `from`/`to` with `moveItemInArray` for object-shaped column configs.

```html
<div forTableHeaderRow forTableColumnReorder (columnReorder)="columns.set($event.columns)">
  @for (col of columns(); track col) {
  <div forTableHeaderCell [name]="col" forDraggable [dragData]="col">{{ col }}</div>
  }
</div>
```

```ts
import { ForDraggable, moveItemInArray } from 'forty-cdk/drag-drop';
import { ForTableColumnReorder } from 'forty-cdk/table';
```

### Row reordering

Apply `[forTableRowReorder]` on the rowgroup element that wraps the data rows (`<div role="rowgroup">` in `<div>` mode, `<tbody>` in native `<table>` mode). The list orientation defaults to `vertical`. Add `[forDraggable] [dragData]="row.id"` to each `[forTableRow]`.

`rowReorder` fires with `{ from, to }` — apply with `moveItemInArray`.

In `mode="grid"` / `mode="treegrid"` the draggable rows **yield their tab stop** to the table's composite roving grid, so a keyboard-navigable, row-reorderable grid keeps the single tab stop the WAI-ARIA Data Grid pattern calls for (`Tab` enters the grid once). Because a row is a _container_, not a grid cell, keyboard reordering starts from a focused **cell**: press `Ctrl`/`Cmd`+`Space` on any cell to lift its enclosing row, then `ArrowUp` / `ArrowDown` (`Home` / `End`, `PageUp` / `PageDown`) move the target, `Space` / `Enter` drop, and `Escape` / `Tab` cancel. Idle Arrow keys stay grid navigation, and `Space` still selects the row when a `selectionMode` is set. In the static `mode="table"` the rowgroup keeps its own draggable-owned tab stop and the plain `Space` / `Enter` lift on a focused row.

```html
<div role="rowgroup" forTableRowReorder (rowReorder)="onRowReorder($event)">
  @for (row of rows(); track row.id) {
  <div forTableRow [value]="row.id" forDraggable [dragData]="row.id">…</div>
  }
</div>
```

```ts
import { ForDraggable, moveItemInArray } from 'forty-cdk/drag-drop';
import { ForTableRowReorder } from 'forty-cdk/table';

onRowReorder(d: TableRowReorderDescriptor): void {
  this.rows.update((r) => moveItemInArray(r, d.from, d.to));
}
```

### Reordering under virtualization

`[forTableRowReorder]` composes with `[forTableVirtualized]`. When virtualization is active, the
drop list only sees the rows currently in the rendered window, so its raw `from` / `to` would be
**window-relative**. `[forTableRowReorder]` translates them to **absolute** dataset indices using
each rendered row's `[virtualIndex]`, so applying `moveItemInArray` to your **full** row array
moves the right row. A non-virtualized table is unaffected — it emits rendered-order indices as
before.

Supported today:

- **Pointer drag within the rendered window**, and **auto-scroll past the window edge** to reach
  rows beyond it — the lifted row is pinned mounted for the duration of the drag so auto-scroll
  cannot unmount it and desync the indices.
- **Single-gesture windowed scrub to an arbitrary far row.** Hold **Shift** during a pointer drag
  and the scroll viewport maps onto the whole dataset — the top edge targets row 0, the bottom edge
  the last row — so one gesture drops the lifted row at any far row without waiting for auto-scroll
  to crawl there. Releasing Shift returns to normal in-window resolution; without Shift, pointer
  resolution is unchanged.
- **Keyboard reorder across the entire dataset.** In `mode="grid"`, `Ctrl`/`Cmd`+`Space` on a
  focused cell lifts the enclosing row; Arrow keys step the target one row at a time; Home / End
  jump to the dataset start (index 0) / end (last absolute index); PageUp / PageDown jump by one
  rendered window; `Space` / `Enter` drop and emit absolute `from` / `to`; `Escape` / `Tab` cancel.
  As the target steps past the rendered window the target row is scrolled into view and the lifted
  row stays pinned mounted throughout. `rowReorder` always emits absolute `from` / `to`.

```html
<div
  #scroll
  forTable
  forTableVirtualized
  mode="grid"
  ariaLabel="People"
  [rowCount]="people().length"
  [scrollElement]="scrollEl()"
  #v="forTableVirtualized"
  style="height: 400px; overflow: auto; position: relative;"
>
  <div forTableHeaderRow style="position: sticky; top: 0;">
    <div forTableHeaderCell name="name">Name</div>
  </div>
  <div
    role="rowgroup"
    forTableRowReorder
    lockAxis="y"
    [style.height.px]="v.totalSize()"
    style="position: relative"
    (rowReorder)="onReorder($event)"
  >
    @for (vrow of v.virtualRows(); track vrow.index) {
    <div
      forTableRow
      [virtualIndex]="vrow.index"
      forDraggable
      [dragData]="vrow.index"
      [style.transform]="'translateY(' + vrow.start + 'px)'"
      style="position: absolute; left: 0; right: 0;"
    >
      <div forTableCell name="name">{{ people()[vrow.index]!.name }}</div>
    </div>
    }
  </div>
</div>
```

```ts
onReorder(d: TableRowReorderDescriptor): void {
  // d.from / d.to are absolute indices into the full people() array.
  this.people.update((p) => moveItemInArray(p, d.from, d.to));
}
```

This is the **supported** way to drag-reorder a virtualized list. A bare
`[forDropList]` wrapping `*forVirtualFor` is **not** — it emits window-relative
indices, lets auto-scroll recycle the lifted row, and confines keyboard stepping
to the rendered window. See
[`docs/drag-in-virtualized-list-spike.md`](../../../docs/drag-in-virtualized-list-spike.md)
for the full analysis and the mechanisms `[forTableRowReorder]` supplies.

### Live-sort placeholder

Both companions forward `[liveSort]` to the wrapped `[forDropList]`. Combined with a
`[forDragPlaceholder]` template on each draggable header cell / row, `[liveSort]="true"` makes
the placeholder follow the **live resolved drop index** during a pointer drag, so the
surrounding cells / rows part to reveal where the item will land — instead of only marking the
dragged item's source slot. It has no effect without a `[forDragPlaceholder]` template, and none
on keyboard dragging. See the [drag-drop README](../drag-drop/README.md) for the full behaviour.

```html
<div
  forTableHeaderRow
  forTableColumnReorder
  [liveSort]="true"
  (columnReorder)="columns.set($event.columns)"
>
  @for (col of columns(); track col) {
  <div forTableHeaderCell [name]="col" forDraggable [dragData]="col">
    {{ col }}
    <ng-template forDragPlaceholder>
      <div class="placeholder"></div>
    </ng-template>
  </div>
  }
</div>
```

### Boundary & axis lock passthrough

Both companions forward `[boundary]` and `[lockAxis]` to the wrapped `[forDropList]`, giving the
same opt-in visual constraint that standalone drop lists support.

Because Angular cannot fix a host-directive input to a constant
([Angular #51691](https://github.com/angular/angular/issues/51691)), `lockAxis` must be set
**explicitly** on the companion element — `lockAxis="x"` for columns (horizontal drag), `lockAxis="y"` for rows (vertical drag).

```html
<div
  forTableHeaderRow
  forTableColumnReorder
  lockAxis="x"
  [boundary]="tableEl"
  (columnReorder)="columns.set($event.columns)"
>
  …
</div>
```

`[boundary]` also accepts a CSS selector string, resolved via `closest()` from the companion's
host element:

```html
<div
  forTableHeaderRow
  forTableColumnReorder
  lockAxis="x"
  [boundary]="'[data-testid=\"table-root\"]'"
  (columnReorder)="columns.set($event.columns)"
>
  …
</div>
```

### Automatic ARIA reindexing

`aria-rowindex` and `aria-colindex` recompute automatically after you apply the move. `ForTable` tracks DOM document order reactively via a `MutationObserver`; when Angular re-renders the `@for` in the new order, the indices update with no extra table code.

### Caveats

- `[forTableSortHeader]` and `[forDraggable]` (column reorder) **may** share the same header cell. When co-located, the draggable's roving tabindex owns the single tab stop and both the header cell and the sort header yield their own `[tabindex]`, so nothing collides on the host attribute (the draggable is detected by DOM marker — the `forDraggable` / `forFreeDrag` attribute — not by a drag-drop import). `aria-sort` / `data-sorted` stay on the cell and clicking it still cycles the sort. In `mode="grid"` / `mode="treegrid"` a column-reorder header row **joins** the body's composite grid ([#1223](https://github.com/tutkli/forty-cdk/issues/1223)), so it shares the single tab stop: idle Arrow keys navigate across header and body, while `Space` / `Enter` on a header cell still lifts it for keyboard reordering. Because both directives also handle Enter / Space, activating a focused co-located cell from the keyboard cycles the sort **and** starts a keyboard drag-lift — keep keyboard sorting and keyboard reorder on separate cells if you need the two interactions distinct.
- Reorderable rows and cells must generate real boxes. Avoid `display: contents` on `[forTableRow]` or header cells used as drag targets — the drag-drop primitive needs a non-zero bounding box for pointer geometry.
- In `mode="grid"`, both 2D cell roving and keyboard row reordering are keyboard-interactive from the same cells: idle Arrow keys navigate, and `Ctrl`/`Cmd`+`Space` lifts the enclosing row for reordering ([#1292](https://github.com/tutkli/forty-cdk/issues/1292)). The rows are not separate tab stops — they yield to the composite grid. Reordering is the consumer's composition choice; the library provides affordances, not opinions about whether both should coexist.
- For all drag-drop CSS hooks (`data-dragging`, `data-drag-over`, `[forDragHandle]`, `[data-drag-preview]`, `data-settling`) see the [drag-drop README](../drag-drop/README.md).

### Inputs

| Directive                 | Input            | Type                            | Default        | Description                                                                                                          |
| ------------------------- | ---------------- | ------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `[forTableColumnReorder]` | `orientation`    | `'horizontal' \| 'vertical'`    | `'horizontal'` | Passthrough to `[forDropList]`, defaulted to `'horizontal'` (column axis). Bind `'vertical'` to override.            |
| `[forTableColumnReorder]` | `dir`            | `'ltr' \| 'rtl' \| null`        | `null`         | Writing direction passthrough.                                                                                       |
| `[forTableColumnReorder]` | `disabled`       | `boolean`                       | `false`        | Disables the whole list passthrough.                                                                                 |
| `[forTableColumnReorder]` | `autoScroll`     | `boolean`                       | `true`         | Auto-scroll passthrough.                                                                                             |
| `[forTableColumnReorder]` | `animateReorder` | `boolean`                       | `false`        | FLIP animation passthrough.                                                                                          |
| `[forTableColumnReorder]` | `liveSort`       | `boolean`                       | `false`        | Live-sort placeholder passthrough.                                                                                   |
| `[forTableColumnReorder]` | `boundary`       | `HTMLElement \| string \| null` | `null`         | Boundary element (or selector) passthrough. Confines the preview; no effect on drop index.                           |
| `[forTableColumnReorder]` | `lockAxis`       | `'x' \| 'y' \| null`            | `null`         | Axis-lock passthrough. Set `'x'` for column drag (holds vertical position). Must be set explicitly — Angular #51691. |
| `[forTableRowReorder]`    | `dir`            | `'ltr' \| 'rtl' \| null`        | `null`         | Writing direction passthrough.                                                                                       |
| `[forTableRowReorder]`    | `disabled`       | `boolean`                       | `false`        | Disables the whole list passthrough.                                                                                 |
| `[forTableRowReorder]`    | `autoScroll`     | `boolean`                       | `true`         | Auto-scroll passthrough.                                                                                             |
| `[forTableRowReorder]`    | `animateReorder` | `boolean`                       | `false`        | FLIP animation passthrough.                                                                                          |
| `[forTableRowReorder]`    | `liveSort`       | `boolean`                       | `false`        | Live-sort placeholder passthrough.                                                                                   |
| `[forTableRowReorder]`    | `boundary`       | `HTMLElement \| string \| null` | `null`         | Boundary element (or selector) passthrough. Confines the preview; no effect on drop index.                           |
| `[forTableRowReorder]`    | `lockAxis`       | `'x' \| 'y' \| null`            | `null`         | Axis-lock passthrough. Set `'y'` for row drag (holds horizontal position). Must be set explicitly — Angular #51691.  |

### Outputs

| Directive                 | Output          | Payload                        | Description                                                          |
| ------------------------- | --------------- | ------------------------------ | -------------------------------------------------------------------- |
| `[forTableColumnReorder]` | `columnReorder` | `TableColumnReorderDescriptor` | `{ from, to, columns }` — fired once per committed column drag-drop. |
| `[forTableRowReorder]`    | `rowReorder`    | `TableRowReorderDescriptor`    | `{ from, to }` — fired once per committed row drag-drop.             |

## Virtualized rows

`[forTableVirtualized]` is opt-in and works only with `<div role>` grid mode. Native `<table>` cannot omit rows mid-body (the browser recalculates all column widths when any row is missing), so virtualization requires the `<div>` structure documented above.

Place `[forTableVirtualized]` on the same element as `[forTable]`. Set `[rowCount]` on `[forTable]` to the **true total** row count — this drives both `aria-rowcount` and the window size.

```html
<div
  #scroll
  forTable
  forTableVirtualized
  mode="grid"
  ariaLabel="Big table"
  [rowCount]="10000"
  [estimateRowSize]="44"
  [scrollElement]="scrollEl()"
  #v="forTableVirtualized"
  style="height: 400px; overflow: auto; position: relative;"
>
  <div forTableHeaderRow style="position: sticky; top: 0;">
    <div forTableHeaderCell name="name">Name</div>
  </div>
  <div role="rowgroup" [style.height.px]="v.totalSize()" style="position: relative">
    @for (vrow of v.virtualRows(); track vrow.index) {
    <div
      forTableRow
      [virtualIndex]="vrow.index"
      [style.transform]="'translateY(' + vrow.start + 'px)'"
      style="position: absolute; left: 0; right: 0;"
    >
      <div forTableCell name="name">{{ data()[vrow.index]!.name }}</div>
    </div>
    }
  </div>
</div>
```

Key points:

- The sticky header rowgroup lives **outside** the absolutely-positioned body so it is not clipped by the scroll container's overflow.
- The body rowgroup is `position: relative` and sized to `v.totalSize()` — this creates the full scroll range.
- Each row is `position: absolute; transform: translateY(vrow.start + 'px')`. Do not use `top` — `transform` avoids layout thrashing.
- Bind `[virtualIndex]="vrow.index"` on each `[forTableRow]`. This is what drives the absolute 1-based `aria-rowindex` (`vrow.index + 1`) rather than the DOM-order index.
- The **focused row stays mounted** even when scrolled out of the window. The roving-focused `gridcell` is never unmounted; roving navigation is unchanged.
- For measured (variable) row heights, call `v.measureRow(el)` per rendered row in `afterEveryRender`.

```ts
import { afterEveryRender } from '@angular/core';
import { ForTableVirtualized } from 'forty-cdk/virtualization';

afterEveryRender(() => {
  for (const el of this.rowEls()) {
    this.v.measureRow(el.nativeElement);
  }
});
```

### Scroll container (table root vs. ancestor)

By default the **table root** is the scroll container — the element carrying `[forTableVirtualized]` scrolls its own rows (the `overflow: auto` element in the examples above), so `[scrollElement]` can be left unset.

When the element that actually scrolls is an **ancestor** of the table — e.g. an app-shell viewport that scrolls projected content — the table cannot inject a scroll container it does not own. Bind `[scrollElement]` to that ancestor by hand (a template reference variable is the simplest source):

```html
<div #shell style="height: 100vh; overflow: auto;">
  <!-- other app-shell content scrolls together with the table -->
  <div
    forTable
    forTableVirtualized
    mode="grid"
    ariaLabel="Big table"
    [rowCount]="10000"
    [scrollElement]="shell"
    #v="forTableVirtualized"
    style="position: relative;"
  >
    <!-- header + windowed rows exactly as above -->
  </div>
</div>
```

#### Wrapping: re-exposing / renaming `scrollElement`

A design-system wrapper that re-exposes `ForTableVirtualized` through `hostDirectives` can surface `scrollElement` directly, or rename it, via input aliasing — no bridging `effect` is needed because the value flows straight through:

```ts
@Component({
  selector: 'app-data-grid',
  hostDirectives: [
    {
      directive: ForTableVirtualized,
      inputs: ['scrollElement: scrollContainer'],
    },
  ],
})
export class DataGrid {}
```

Consumers of the wrapper then bind `[scrollContainer]="shell"`.

### `[forTableVirtualized]` inputs

| Input             | Type                  | Default | Description                                                                                                         |
| ----------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `estimateRowSize` | `number`              | `44`    | Estimated row height in px. Used as the fixed size in fixed-size mode and as the initial estimate in measured mode. |
| `scrollElement`   | `HTMLElement \| null` | `null`  | Explicit scroll container. Defaults to the table root element; bind to an ancestor when it owns the scroll.         |

### `[forTableVirtualized]` API (`#v="forTableVirtualized"`)

| Member                         | Type                                | Description                                                                                                                                                                           |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `virtualRows()`                | `Signal<readonly VirtualItem[]>`    | The visible window plus overscan, always including the focused row.                                                                                                                   |
| `range()`                      | `Signal<readonly [number, number]>` | The rendered window as `[firstIndex, lastIndex + 1)`, sourced from the true virtualizer window (not the focus-augmented `virtualRows()`). Plugs straight into `injectInfiniteScroll`. |
| `totalSize()`                  | `Signal<number>`                    | Total scroll height of all rows in px. Bind to the body container height.                                                                                                             |
| `scrollToRow(index, options?)` | method                              | Scroll the container so row `index` is in view.                                                                                                                                       |
| `measureRow(el)`               | method                              | Record a rendered row element's measured size (for dynamic row heights).                                                                                                              |

### Tree-shaking

`@tanstack/virtual-core` only loads when you import `ForTableVirtualized`. A plain `ForTable` never pulls in the virtualization core.

## API

### `ForTable`

| Property            | Type                               | Description                                                                                                                                  |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`              | `'table' \| 'grid' \| 'treegrid'`  | ARIA role emitted on the host.<br>**Default:** `'table'`                                                                                     |
| `ariaLabel`         | `string \| null`                   | Reactive accessible label.<br>**Default:** `null`                                                                                            |
| `dir`               | `'ltr' \| 'rtl' \| null`           | Writing direction; resolves ambient when unset.<br>**Default:** `null`                                                                       |
| `rowCount`          | `number`                           | True total data-row count for `aria-rowcount`. Ignored in `table` mode.<br>**Default:** rendered count                                       |
| `colCount`          | `number`                           | True total column count for `aria-colcount`. Ignored in `table` mode.<br>**Default:** rendered count                                         |
| `selectionMode`     | `'none' \| 'single' \| 'multiple'` | Row selection mode.<br>**Default:** `'none'`                                                                                                 |
| `selectionBehavior` | `'toggle' \| 'replace'`            | How a row click mutates selection (modifier-aware in `replace` mode).<br>**Default:** `'toggle'`                                             |
| `value`             | `model<readonly T[]>([])`          | Two-way bindable selected row values. Infers the row-value type `T`.<br>**Default:** `[]`                                                    |
| `compareWith`       | `(a: T, b: T) => boolean`          | Equality comparator for row values. Override for object rows.<br>**Default:** `===`                                                          |
| `selectableValues`  | `readonly T[] \| null`             | Full ordered set of selectable values for total-aware aggregates under virtualization; `null` uses the rendered rows.<br>**Default:** `null` |
| `expanded`          | `model<readonly T[]>([])`          | Two-way bindable open parent-row values for `mode="treegrid"`. Ignored in other modes.<br>**Default:** `[]`                                  |

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

| Property            | Type                | Description                                                                                                                                                                                                                   |
| ------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `column`            | `string` (required) | Column identity; included in the `resizeCommit` payload and the CSS var name.<br>**Default:** —                                                                                                                               |
| `width`             | `model<number>()`   | Current column width in pixels. Two-way bindable via `[(width)]`. Fires `widthChange` on every live update.<br>**Default:** —                                                                                                 |
| `min`               | `number`            | Minimum width in pixels.<br>**Default:** `0`                                                                                                                                                                                  |
| `max`               | `number`            | Maximum width in pixels. No upper bound by default.<br>**Default:** `Infinity`                                                                                                                                                |
| `step`              | `number`            | Pixels applied per `ArrowLeft` / `ArrowRight` press.<br>**Default:** `10`                                                                                                                                                     |
| `autoFit`           | `boolean`           | Opt-in: `dblclick` on the handle fits the column to its content width via `fitToContent()`. No behaviour change when unset.<br>**Default:** `false`                                                                           |
| `fitIncludesHeader` | `boolean`           | Opt-in: auto-fit also accounts for the header label (marked with a sibling `[forTableColumnLabel]`), fitting to `max(header label, …data cells)`. Degrades to data-cells-only with no marker present.<br>**Default:** `false` |

### Data attributes

| Token / attribute              | Emitted by                                      | Values / description                                                                        |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `--for-table-header-height`    | `[forTable]`                                    | Header row height in px. Updated on resize.                                                 |
| `data-mode`                    | `[forTable]`                                    | `'table' \| 'grid' \| 'treegrid'`                                                           |
| `data-column`                  | header / data cell                              | Column name from the `name` input.                                                          |
| `data-sticky`                  | header / data cell                              | `''` (start-edge) or `'end'` when sticky; absent otherwise.                                 |
| `data-highlighted`             | header / data cell                              | Present on the currently roving-focused cell in grid / treegrid mode.                       |
| `aria-expanded`                | `[forTableRow]`                                 | `"true"` / `"false"` (always-emit) on expandable rows in `treegrid` mode; absent on leaves. |
| `data-state`                   | `[forTableRow]`                                 | `"open"` / `"closed"` on expandable rows in `treegrid` mode; absent on leaves.              |
| `aria-level`                   | `[forTableRow]`                                 | 1-based depth in `treegrid` mode; absent otherwise.                                         |
| `aria-posinset`                | `[forTableRow]`                                 | 1-based position among same-level siblings in `treegrid` mode; absent otherwise.            |
| `aria-setsize`                 | `[forTableRow]`                                 | Total same-level sibling count in `treegrid` mode; absent otherwise.                        |
| `aria-rowindex`                | `[forTableHeaderRow]`                           | `"1"` in grid / treegrid mode (the header is the grid's first row); absent in table mode.   |
| `aria-rowindex`                | `[forTableRow]`                                 | 1-based row index counting the header row (first data row is `2`). Absent in table mode.    |
| `aria-colindex`                | header / data cell                              | 1-based column index within the row. Absent in table mode.                                  |
| `aria-selected`                | `[forTableRow]`                                 | `"true"` / `"false"` (always-emit) when `selectionMode` is not `'none'`.                    |
| `data-selected`                | `[forTableRow]`                                 | Present (`""`) when selected; absent when not. Boolean present/absent hook.                 |
| `aria-multiselectable`         | `[forTable]`                                    | `"true"` when `selectionMode="multiple"`; absent otherwise.                                 |
| `data-state`                   | `[forTableRowSelector]`                         | `"checked"` or `"unchecked"`. The row owns `aria-selected`; this is decoration.             |
| `aria-checked`                 | `[forTableSelectAll]`                           | `"true"` / `"false"` / `"mixed"` (tri-state).                                               |
| `data-state`                   | `[forTableSelectAll]`                           | `"checked"` / `"unchecked"` / `"indeterminate"`.                                            |
| `aria-sort`                    | `[forTableSortHeader]`                          | `"ascending"` or `"descending"` while sorted; absent (`null`) when unsorted. Truthy-only.   |
| `data-sorted`                  | `[forTableSortHeader]`                          | Same value as `aria-sort` — a CSS styling hook (e.g. for a sort arrow glyph).               |
| `--for-table-col-<name>-width` | `[forTable]` (set by `[forTableColumnResizer]`) | Resolved column width in px; apply it to your layout.                                       |
| `data-resizing`                | `[forTableColumnResizer]`                       | Present (`""`) while a pointer drag is active.                                              |

## Accessibility

Implements the [WAI-ARIA Table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/) and the [WAI-ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

- **Label the table** via the reactive `[ariaLabel]` input or a native `aria-labelledby` pointing at a visible caption / heading.
- **`mode="table"`** sets `role="table"` with semantic `role="columnheader"` / `role="cell"` cells. Screen readers announce row and column counts from native semantics.
- **`mode="grid"`** sets `role="grid"` with `role="gridcell"` cells. The root emits `aria-rowcount` / `aria-colcount`; the header row and every data row emit `aria-rowindex` (the header row is `1`, so data rows start at `2` and `aria-rowcount` counts the header); header and data cells emit `aria-colindex`. Header and body share one composite roving tab stop; `PageUp` / `PageDown` page by rows, and `Enter` / `F2` enter an interactive cell's widget (`Escape` exits). Override `[rowCount]` / `[colCount]` for server-paged or virtualized datasets so screen readers announce correct totals.
- **`mode="treegrid"`** sets `role="treegrid"`. Expandable rows emit `aria-expanded="true"|"false"` and `aria-level` / `aria-posinset` / `aria-setsize`; leaf rows emit none of these, matching APG "end nodes lack `aria-expanded`".
- **Row selection** (`selectionMode` not `'none'`): each row emits `aria-selected="true"|"false"`; `'multiple'` mode adds `aria-multiselectable="true"` on the root. `[forTableSelectAll]` emits `aria-checked` in tri-state.
- **Sortable headers** emit `aria-sort="ascending"|"descending"` while sorted; the attribute is absent (not `"none"`) when unsorted, per APG.
- **Column resizers** must be focusable elements with an `aria-label` naming the column — e.g. `aria-label="Resize Name column"`.
- **Disabled cells** use `aria-disabled="true"` + `data-disabled`; they are skipped during grid navigation but remain focusable, consistent with the APG disabled pattern.
- All horizontal keyboard navigation is RTL-mirrored when the resolved writing direction is `rtl`.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the `data-*` attributes and CSS custom properties listed under [Data attributes](#data-attributes).
