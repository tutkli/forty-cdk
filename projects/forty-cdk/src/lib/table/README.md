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

## Treegrid mode (expandable hierarchical rows)

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

### Total-aware aggregates under virtualization: `[selectableValues]`

By default the select-all tri-state, `toggleSelectAll`, and Shift-click range selection compute against the **registered (rendered)** rows. Under `[forTableVirtualized]` only the windowed rows are registered, so these aggregates would otherwise see only the visible slice — select-all would report "all" once every _visible_ row is selected, and a range could not span unmounted rows.

Supply the full ordered set of selectable values via `[selectableValues]` so the aggregates compute against the true dataset instead of the window:

- The select-all tri-state reflects `selection` vs. the full set, so it stays correct across scrolling.
- `toggleSelectAll()` selects / clears every supplied value.
- Shift-click range resolves against the supplied order, so a range can span rows that are not currently mounted.

Per-row selection (`[forTableRowSelector]`, row click, Space) is unaffected — it persists in the bound `[(selection)]` array regardless of mount state. Leave `[selectableValues]` unset (`null`, the default) for non-virtualized tables to keep the registered-rows behaviour.

```html
<div
  forTable
  forTableVirtualized
  mode="grid"
  selectionMode="multiple"
  [rowCount]="people().length"
  [selectableValues]="peopleIds()"
  [(selection)]="selection"
>
  <!-- header with [forTableSelectAll], windowed rows with [forTableRowSelector] -->
</div>
```

```ts
protected readonly peopleIds = computed(() => this.people().map((p) => p.id));
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

## Column & row reordering

`[forTableColumnReorder]` and `[forTableRowReorder]` are opt-in companion directives that compose the **drag-drop** primitive to make table headers and data rows reorderable. Each wraps `[forDropList]` via `hostDirectives`, so every drag-drop capability — `[forDraggable]`, `[forDragHandle]`, `[forDragPreview]`, `[forDragPlaceholder]`, FLIP animations, live announce, keyboard and pointer drag — is available to the consumer exactly as with a standalone drop list. **The table never mutates the consumer's data.** Reorder handlers apply `moveItemInArray` to a local signal.

### Column reordering

Apply `[forTableColumnReorder]` on the `[forTableHeaderRow]` element and add `[forDraggable] [dragData]="col"` to each header cell. **You must set `orientation="horizontal"`** on the element — Angular cannot fix a host-directive input to a constant ([Angular #51691](https://github.com/angular/angular/issues/51691)), so the consumer must forward the axis explicitly.

`columnReorder` fires once per committed drop (pointer or keyboard) with `{ from, to, columns }`. Apply `columns` directly to your column-name signal, or use `from`/`to` with `moveItemInArray` for object-shaped column configs.

```html
<div
  forTableHeaderRow
  forTableColumnReorder
  orientation="horizontal"
  (columnReorder)="columns.set($event.columns)"
>
  @for (col of columns(); track col) {
  <div forTableHeaderCell [name]="col" forDraggable [dragData]="col">{{ col }}</div>
  }
</div>
```

```ts
import { ForTableColumnReorder, ForDraggable, moveItemInArray } from 'forty-cdk';
```

### Row reordering

Apply `[forTableRowReorder]` on the rowgroup element that wraps the data rows (`<div role="rowgroup">` in `<div>` mode, `<tbody>` in native `<table>` mode). The list orientation defaults to `vertical`. Add `[forDraggable] [dragData]="row.id"` to each `[forTableRow]`.

`rowReorder` fires with `{ from, to }` — apply with `moveItemInArray`.

```html
<div role="rowgroup" forTableRowReorder (rowReorder)="onRowReorder($event)">
  @for (row of rows(); track row.id) {
  <div forTableRow [value]="row.id" forDraggable [dragData]="row.id">…</div>
  }
</div>
```

```ts
import { ForTableRowReorder, ForDraggable, moveItemInArray } from 'forty-cdk';

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
- **Keyboard reorder across the entire dataset.** Space lifts the focused row; Arrow keys step
  the target one row at a time; Home / Ctrl+Home jumps to the dataset start (index 0); End /
  Ctrl+End jumps to the dataset end (last absolute index); PageUp / PageDown jump by one rendered
  window; Space drops and emits absolute `from` / `to`. As the target steps past the rendered
  window the target row is scrolled into view and the lifted row stays pinned mounted throughout.
  `rowReorder` always emits absolute `from` / `to`.

Deferred (a `[forTableVirtualized]` row is the only drag-drop composition with this gap):

- **Single-gesture free pointer drag to an arbitrary far row** that auto-scroll cannot reach.

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
  orientation="horizontal"
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
  orientation="horizontal"
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
  orientation="horizontal"
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

- `[forTableSortHeader]` and `[forDraggable]` (column reorder) **may** share the same header cell. When co-located, the draggable's roving tabindex owns the single tab stop and the sort header yields its own `[tabindex]`, so the two no longer collide on the host attribute; `aria-sort` / `data-sorted` stay on the cell and clicking it still cycles the sort. Because both directives also handle Enter / Space, activating a focused co-located cell from the keyboard cycles the sort **and** starts a keyboard drag-lift — keep keyboard sorting and keyboard reorder on separate cells if you need the two interactions distinct.
- Reorderable rows and cells must generate real boxes. Avoid `display: contents` on `[forTableRow]` or header cells used as drag targets — the drag-drop primitive needs a non-zero bounding box for pointer geometry.
- In `mode="grid"`, both 2D cell roving and keyboard row dragging are keyboard-interactive. Reordering is the consumer's composition choice; the library provides affordances, not opinions about whether both should coexist.
- For all drag-drop CSS hooks (`data-dragging`, `data-drag-over`, `[forDragHandle]`, `[data-drag-preview]`, `data-settling`) see the [drag-drop README](../drag-drop/README.md).

### Inputs

| Directive                 | Input            | Type                            | Default      | Description                                                                                                          |
| ------------------------- | ---------------- | ------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `[forTableColumnReorder]` | `orientation`    | `'horizontal' \| 'vertical'`    | `'vertical'` | Passthrough to `[forDropList]`. **Must be set to `'horizontal'`.**                                                   |
| `[forTableColumnReorder]` | `dir`            | `'ltr' \| 'rtl' \| null`        | `null`       | Writing direction passthrough.                                                                                       |
| `[forTableColumnReorder]` | `disabled`       | `boolean`                       | `false`      | Disables the whole list passthrough.                                                                                 |
| `[forTableColumnReorder]` | `autoScroll`     | `boolean`                       | `true`       | Auto-scroll passthrough.                                                                                             |
| `[forTableColumnReorder]` | `animateReorder` | `boolean`                       | `false`      | FLIP animation passthrough.                                                                                          |
| `[forTableColumnReorder]` | `liveSort`       | `boolean`                       | `false`      | Live-sort placeholder passthrough.                                                                                   |
| `[forTableColumnReorder]` | `boundary`       | `HTMLElement \| string \| null` | `null`       | Boundary element (or selector) passthrough. Confines the preview; no effect on drop index.                           |
| `[forTableColumnReorder]` | `lockAxis`       | `'x' \| 'y' \| null`            | `null`       | Axis-lock passthrough. Set `'x'` for column drag (holds vertical position). Must be set explicitly — Angular #51691. |
| `[forTableRowReorder]`    | `dir`            | `'ltr' \| 'rtl' \| null`        | `null`       | Writing direction passthrough.                                                                                       |
| `[forTableRowReorder]`    | `disabled`       | `boolean`                       | `false`      | Disables the whole list passthrough.                                                                                 |
| `[forTableRowReorder]`    | `autoScroll`     | `boolean`                       | `true`       | Auto-scroll passthrough.                                                                                             |
| `[forTableRowReorder]`    | `animateReorder` | `boolean`                       | `false`      | FLIP animation passthrough.                                                                                          |
| `[forTableRowReorder]`    | `liveSort`       | `boolean`                       | `false`      | Live-sort placeholder passthrough.                                                                                   |
| `[forTableRowReorder]`    | `boundary`       | `HTMLElement \| string \| null` | `null`       | Boundary element (or selector) passthrough. Confines the preview; no effect on drop index.                           |
| `[forTableRowReorder]`    | `lockAxis`       | `'x' \| 'y' \| null`            | `null`       | Axis-lock passthrough. Set `'y'` for row drag (holds horizontal position). Must be set explicitly — Angular #51691.  |

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
import { ForTableVirtualized } from 'forty-cdk';

afterEveryRender(() => {
  for (const el of this.rowEls()) {
    this.v.measureRow(el.nativeElement);
  }
});
```

### `[forTableVirtualized]` inputs

| Input             | Type                  | Default | Description                                                                                                         |
| ----------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `estimateRowSize` | `number`              | `44`    | Estimated row height in px. Used as the fixed size in fixed-size mode and as the initial estimate in measured mode. |
| `scrollElement`   | `HTMLElement \| null` | `null`  | Explicit scroll container. Defaults to the table root element.                                                      |

### `[forTableVirtualized]` API (`#v="forTableVirtualized"`)

| Member                         | Type                             | Description                                                               |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------------------- |
| `virtualRows()`                | `Signal<readonly VirtualItem[]>` | The visible window plus overscan, always including the focused row.       |
| `totalSize()`                  | `Signal<number>`                 | Total scroll height of all rows in px. Bind to the body container height. |
| `scrollToRow(index, options?)` | method                           | Scroll the container so row `index` is in view.                           |
| `measureRow(el)`               | method                           | Record a rendered row element's measured size (for dynamic row heights).  |

### Tree-shaking

`@tanstack/virtual-core` only loads when you import `ForTableVirtualized`. A plain `ForTable` never pulls in the virtualization core.

## Inputs

| Directive                 | Input               | Type                                    | Default        | Description                                                                                                           |
| ------------------------- | ------------------- | --------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `[forTable]`              | `mode`              | `'table' \| 'grid' \| 'treegrid'`       | `'table'`      | ARIA role emitted on the host.                                                                                        |
| `[forTable]`              | `ariaLabel`         | `string \| null`                        | `null`         | Reactive accessible label.                                                                                            |
| `[forTable]`              | `dir`               | `'ltr' \| 'rtl' \| null`                | `null`         | Writing direction; resolves ambient when unset.                                                                       |
| `[forTable]`              | `rowCount`          | `number`                                | rendered count | True total data-row count for `aria-rowcount`. Ignored in `table` mode.                                               |
| `[forTable]`              | `colCount`          | `number`                                | rendered count | True total column count for `aria-colcount`. Ignored in `table` mode.                                                 |
| `[forTable]`              | `selectionMode`     | `'none' \| 'single' \| 'multiple'`      | `'none'`       | Row selection mode.                                                                                                   |
| `[forTable]`              | `selectionBehavior` | `'toggle' \| 'replace'`                 | `'toggle'`     | How a row click mutates selection (modifier-aware in `replace` mode).                                                 |
| `[forTable]`              | `selection`         | `model<readonly unknown[]>([])`         | `[]`           | Two-way bindable selected row values.                                                                                 |
| `[forTable]`              | `compareWith`       | `(a: unknown, b: unknown) => boolean`   | `===`          | Equality comparator for row values. Override for object rows.                                                         |
| `[forTable]`              | `selectableValues`  | `readonly unknown[] \| null`            | `null`         | Full ordered set of selectable values for total-aware aggregates under virtualization; `null` uses the rendered rows. |
| `[forTable]`              | `expanded`          | `model<readonly unknown[]>([])`         | `[]`           | Two-way bindable open parent-row values for `mode="treegrid"`. Ignored in other modes.                                |
| `[forTableHeaderCell]`    | `name`              | `string` (required)                     | —              | Column identifier, reflected as `data-column`.                                                                        |
| `[forTableHeaderCell]`    | `sticky`            | `boolean \| 'end'`                      | `false`        | Sticky edge; reflected as `data-sticky`.                                                                              |
| `[forTableCell]`          | `name`              | `string` (required)                     | —              | Column identifier, reflected as `data-column`.                                                                        |
| `[forTableCell]`          | `sticky`            | `boolean \| 'end'`                      | `false`        | Sticky edge; reflected as `data-sticky`.                                                                              |
| `[forTableCell]`          | `disabled`          | `boolean`                               | `false`        | Skipped during navigation; reflects `aria-disabled` / `data-disabled`.                                                |
| `[forTableRow]`           | `value`             | `unknown`                               | `undefined`    | Selection identity for this row. Leave unset for non-selectable rows.                                                 |
| `[forTableRow]`           | `level`             | `number`                                | `1`            | 1-based tree depth for `aria-level` in `mode="treegrid"`. Ignored in other modes.                                     |
| `[forTableRow]`           | `expandable`        | `boolean`                               | `false`        | Marks this row as an expandable parent; emits `aria-expanded` + `data-state`.                                         |
| `[forTableSelectAll]`     | `ariaLabel`         | `string \| null`                        | `null`         | Accessible label for the select-all checkbox (e.g. `"Select all rows"`).                                              |
| `[forTableSortHeader]`    | `column`            | `string` (required)                     | —              | Column identity included in the `sortChange` payload.                                                                 |
| `[forTableSortHeader]`    | `direction`         | `'ascending' \| 'descending' \| 'none'` | `'none'`       | Current sort direction (two-way bindable via `[(direction)]`).                                                        |
| `[forTableSortHeader]`    | `disableClear`      | `boolean`                               | `false`        | Skip the `'none'` step: cycle becomes `ascending ↔ descending`.                                                       |
| `[forTableSortHeader]`    | `sortable`          | `boolean`                               | `true`         | When `false`, the header is fully inert (no tabindex, no aria-sort).                                                  |
| `[forTableColumnResizer]` | `column`            | `string` (required)                     | —              | Column identity; included in the `resizeCommit` payload and the CSS var name.                                         |
| `[forTableColumnResizer]` | `width`             | `model<number>()`                       | `undefined`    | Current column width in pixels. Two-way bindable via `[(width)]`. Fires `widthChange` on every live update.           |
| `[forTableColumnResizer]` | `min`               | `number`                                | `0`            | Minimum width in pixels.                                                                                              |
| `[forTableColumnResizer]` | `max`               | `number`                                | `Infinity`     | Maximum width in pixels. No upper bound by default.                                                                   |
| `[forTableColumnResizer]` | `step`              | `number`                                | `10`           | Pixels applied per `ArrowLeft` / `ArrowRight` press.                                                                  |

## CSS hooks

| Token / attribute              | Emitted by                                      | Description                                                                                 |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `--for-table-header-height`    | `[forTable]`                                    | Header row height in px. Updated on resize.                                                 |
| `data-mode`                    | `[forTable]`                                    | `'table' \| 'grid' \| 'treegrid'`                                                           |
| `data-column`                  | header / data cell                              | Column name from the `name` input.                                                          |
| `data-sticky`                  | header / data cell                              | `''` (start-edge) or `'end'` when sticky; absent otherwise.                                 |
| `data-highlighted`             | `[forTableCell]`                                | Present on the currently roving-focused cell in grid / treegrid mode.                       |
| `aria-expanded`                | `[forTableRow]`                                 | `"true"` / `"false"` (always-emit) on expandable rows in `treegrid` mode; absent on leaves. |
| `data-state`                   | `[forTableRow]`                                 | `"open"` / `"closed"` on expandable rows in `treegrid` mode; absent on leaves.              |
| `aria-level`                   | `[forTableRow]`                                 | 1-based depth in `treegrid` mode; absent otherwise.                                         |
| `aria-posinset`                | `[forTableRow]`                                 | 1-based position among same-level siblings in `treegrid` mode; absent otherwise.            |
| `aria-setsize`                 | `[forTableRow]`                                 | Total same-level sibling count in `treegrid` mode; absent otherwise.                        |
| `aria-rowindex`                | `[forTableRow]`                                 | 1-based row index in the data row set. Absent in table mode.                                |
| `aria-colindex`                | `[forTableCell]`                                | 1-based column index within the row. Absent in table mode.                                  |
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
