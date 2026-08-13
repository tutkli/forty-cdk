# Table: column & row reordering

How `forty-cdk/table` composes `forty-cdk/drag-drop` to make header columns and data rows
reorderable — including the shared-tab-stop keyboard model, the virtualization interaction, and the
boundary / axis-lock passthrough. Split out of the table README in
[#1401](https://github.com/tutkli/forty-cdk/issues/1401) because it spans two entry points; the
table itself is documented in [the table README](../projects/forty-cdk/table/README.md) and the
drag-drop vocabulary in [its own](../projects/forty-cdk/drag-drop/README.md).

`[forTableColumnReorder]` and `[forTableRowReorder]` are opt-in companion directives that compose the **drag-drop** primitive to make table headers and data rows reorderable. Each wraps `[forDropList]` via `hostDirectives`, so every drag-drop capability — `[forDraggable]`, `[forDragHandle]`, `[forDragPreview]`, `[forDragPlaceholder]`, FLIP animations, live announce, keyboard and pointer drag — is available to the consumer exactly as with a standalone drop list. **The table never mutates the consumer's data.** Reorder handlers apply `moveItemInArray` to a local signal.

## Column reordering

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

## Row reordering

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

## Reordering under virtualization

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
to the rendered window. Those are exactly the three mechanisms
`[forTableRowReorder]` supplies on top of it: absolute-index translation, a
lifted row pinned against recycling, and keyboard stepping over the true total
count. A custom integration that uses neither companion owes all three, and
missing one fails silently rather than loudly.

## Live-sort placeholder

Both companions forward `[liveSort]` to the wrapped `[forDropList]`. Combined with a
`[forDragPlaceholder]` template on each draggable header cell / row, `[liveSort]="true"` makes
the placeholder follow the **live resolved drop index** during a pointer drag, so the
surrounding cells / rows part to reveal where the item will land — instead of only marking the
dragged item's source slot. It has no effect without a `[forDragPlaceholder]` template, and none
on keyboard dragging. See the [drag-drop README](../projects/forty-cdk/drag-drop/README.md) for the full behaviour.

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

## Boundary & axis lock passthrough

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

## Automatic ARIA reindexing

`aria-rowindex` and `aria-colindex` recompute automatically after you apply the move. `ForTable` tracks DOM document order reactively via a `MutationObserver`; when Angular re-renders the `@for` in the new order, the indices update with no extra table code.

## Caveats

- `[forTableSortHeader]` and `[forDraggable]` (column reorder) **may** share the same header cell. When co-located, the draggable's roving tabindex owns the single tab stop and both the header cell and the sort header yield their own `[tabindex]`, so nothing collides on the host attribute (the draggable is detected by DOM marker — the `forDraggable` / `forFreeDrag` attribute — not by a drag-drop import). `aria-sort` / `data-sorted` stay on the cell and clicking it still cycles the sort. In `mode="grid"` / `mode="treegrid"` a column-reorder header row **joins** the body's composite grid ([#1223](https://github.com/tutkli/forty-cdk/issues/1223)), so it shares the single tab stop: idle Arrow keys navigate across header and body. The two keyboard activations split along WAI-ARIA lines so a single key press never both sorts and lifts ([#1343](https://github.com/tutkli/forty-cdk/issues/1343)): **`Space`** lifts the column for keyboard reordering (and drops it), while **`Enter`** toggles the sort. A sort-only header (no `[forDraggable]`) still sorts on both `Enter` and `Space`, and a reorder-only header (no `[forTableSortHeader]`) still lifts on both — the split only applies where the two affordances co-locate. It is driven by the same `data-sortable` DOM marker (via the drag-drop `FOR_DRAGGABLE_LIFT_GUARD` seam), so neither directive imports the other.
- Reorderable rows and cells must generate real boxes. Avoid `display: contents` on `[forTableRow]` or header cells used as drag targets — the drag-drop primitive needs a non-zero bounding box for pointer geometry.
- In `mode="grid"`, both 2D cell roving and keyboard row reordering are keyboard-interactive from the same cells: idle Arrow keys navigate, and `Ctrl`/`Cmd`+`Space` lifts the enclosing row for reordering ([#1292](https://github.com/tutkli/forty-cdk/issues/1292)). The rows are not separate tab stops — they yield to the composite grid. Reordering is the consumer's composition choice; the library provides affordances, not opinions about whether both should coexist.
- For all drag-drop CSS hooks (`data-dragging`, `data-drag-over`, `[forDragHandle]`, `[data-drag-preview]`, `data-settling`) see the [drag-drop README](../projects/forty-cdk/drag-drop/README.md).

## Inputs

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

## Outputs

| Directive                 | Output          | Payload                        | Description                                                          |
| ------------------------- | --------------- | ------------------------------ | -------------------------------------------------------------------- |
| `[forTableColumnReorder]` | `columnReorder` | `TableColumnReorderDescriptor` | `{ from, to, columns }` — fired once per committed column drag-drop. |
| `[forTableRowReorder]`    | `rowReorder`    | `TableRowReorderDescriptor`    | `{ from, to }` — fired once per committed row drag-drop.             |
