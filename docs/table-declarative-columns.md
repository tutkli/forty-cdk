# Table: declarative columns

The optional ergonomic layer over `forty-cdk/table` — author one `[forColumnDef]` per column and
let `<for-table-body>` stamp the header row and one data row per item. Split out of the table
README in [#1401](https://github.com/tutkli/forty-cdk/issues/1401); the raw
`[forTableCell]` / `[forTableHeaderCell]` primitives it builds on are documented in
[the table README](../projects/forty-cdk/table/README.md).

Hand-writing every cell in the header row **and** the data row keeps the two in sync by hand and
smears a single column across several places. The optional ergonomic layer lets you author one
`[forColumnDef]` per column and have `<for-table-body>` stamp the header row and one data row per item
out of the same cell primitives. Place it inside a `[forTable]`; it is additive — the raw
`[forTableRow]` / `[forTableCell]` primitives in
[the table README](../projects/forty-cdk/table/README.md) keep working unchanged, and a table that
never imports `ForTableBody` never bundles it.

**Supported modes: `table` and `grid`.** Nothing in `<for-table-body>` is grid-specific — it derives
each stamped cell's role from the table `mode` and applies no mode guard, so it works under the default
`mode="table"` and under `mode="grid"` alike. Choose `mode="grid"` for **interactive** cells: roving 2D
keyboard navigation, cell widgets, and cell-entry. Choose `mode="table"` for **read-only** or
**whole-row navigation** lists, where `role="grid"` would announce an interaction model the list does
not have — see [Whole-row navigation lists](#whole-row-navigation-lists) for the row-interaction hooks
(`interactiveRows` / `rowActivate` / `rowContextMenu`). `mode="treegrid"` is out of scope: the body
stamps no expansion affordances. The examples below use `mode="grid"`, but each stamps identically under
`mode="table"` (only the emitted roles change — `role="table"` with `role="cell"` cells).

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
  `[loading]` / `[placeholderRows]` (render `forPlaceholderCell` skeletons — or the body-level
  `forPlaceholderCellDefault` — for the initial full-replace load; see
  [Interleaved placeholder rows](#interleaved-placeholder-rows) for the infinite-scroll shape
  that keeps loaded rows and appends trailing skeletons). It **owns
  `grid-template-columns`**: each column contributes its `[width]`, falling back to the published
  `--for-table-col-<name>-width` resize var — so a resized column drives its own track with no glue.
- **Auto-wired from per-column flags:** `sortable` wires `[forTableSortHeader]` (the body derives each
  header's direction from its `[sort]` input and re-emits `(sortChange)`), and `resizable` wires
  `[forTableColumnResizer]` (re-emitted through `(resizeCommit)`; give `resizeAriaLabel` so the handle
  is named). Tune the handle per column on `[forColumnDef]`: `[resizeMin]` / `[resizeMax]` (bounds,
  driving `aria-valuemin` / `aria-valuemax`), `[resizeStep]` (arrow-key increment), `autoFit`
  (double-click size-to-content, **on by default**; set `[autoFit]="false"` to disable), and
  `fitIncludesHeader` (also account for the header label, isolated with a `[forTableColumnLabel]` inside
  the `[forHeaderCell]` template). Let the body own width **state** with `[(columnWidths)]` — see
  [Persisting column widths](#persisting-column-widths-columnwidths) — or keep applying widths yourself
  from `(resizeCommit)`.
- **Consumer-placed in templates:** selection (`[forTableRowSelector]` / `[forTableSelectAll]`) and any
  interactive widget go straight into the cell templates. Row-context primitives resolve their
  `[forTableRow]` because the body stamps content with the cell's own injector.
- **Styling the stamped cells:** the body owns the header / data cell elements, so add a class to them
  per column with `[headerClass]` / `[cellClass]` on `[forColumnDef]` (see
  [Styling the stamped cells](#styling-the-stamped-cells) below).
- **Typing `let-row`:** bind `[forDataCellRow]` to the same array you pass to `[rows]` — it is read only
  for type inference, so `let-row` is typed as your row type. With a discriminated-union row type,
  bind `[forDataCellUnless]` (and `[forRowCellWhen]` on variants) to narrow it further — see
  [Typing a discriminated-union row](#typing-a-discriminated-union-row) below.

`<for-table-body>`'s host is `display: contents`, so it adds no box between `[forTable]` and its rows;
all visual styling stays yours off the same `data-*` / role hooks the raw primitives emit. Full-span
**row variants** (group headers, separators, summary rows) are covered below via `[forRowDef]`, and
drag **column reordering** via the `reorderable` flag — see
[Column reordering](#column-reordering-reorderable--columnreorder).

> **Bundle note.** `<for-table-body>` statically imports `forty-cdk/drag-drop` (~14 KB gzipped) so a
> `reorderable` column can auto-wire drag reordering, so every `<for-table-body>` consumer bundles it —
> even one with no reorderable column. Per-entry-point tree-shaking is otherwise intact (a table that
> never imports `ForTableBody` bundles neither it nor drag-drop). If a simple table is bundle-sensitive
> and needs no declarative ergonomics, author it from the raw `[forTableHeaderCell]` / `[forTableCell]`
> primitives instead — that path never touches drag-drop.

### Styling the stamped cells

Because `<for-table-body>` stamps the header and data cell elements itself, a consumer cannot put a
class on them from the template. Add one per column with `[headerClass]` (on the stamped
`[forTableHeaderCell]`) and `[cellClass]` (on the stamped `[forTableCell]` of every data **and**
placeholder row). Both are static strings applied alongside the cells' existing `data-*` / role hooks;
leaving them unset adds no `class` attribute at all.

```html
<ng-container forColumnDef="amount" headerClass="num-header" cellClass="num-cell text-right">
  <ng-template forHeaderCell>Amount</ng-template>
  <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.amount }}</ng-template>
</ng-container>
```

This is the seam a wrapping design system needs: it can key its stylesheet off classes it owns (a
`.num-cell` it applies here) instead of scoping CSS to the body's template internals
(`for-table-body [forTableCell]`, role selectors), and it reaches the cell box itself — padding,
truncation, alignment, sticky backgrounds — rather than a wrapper node inside the template. Per-datum
row styling (varying by the row's data, not just the column) is covered by
[`[rowClass]` / `[rowAttrs]`](#styling-a-row-from-its-datum-rowclass--rowattrs) below.

### Persisting column widths (`[(columnWidths)]`)

Instead of maintaining a widths signal, per-column seed / update handlers, and a hand-built
`grid-template-columns` string, let `<for-table-body>` own the width **state**: bind `[(columnWidths)]`
to a plain map keyed by column `name`. It seeds each `resizable` column's handle `[width]` — so the
`role="separator"` handle exposes `aria-valuenow` from the first render and the column's track picks up
the seeded width immediately — and folds every live change (pointer drag, keyboard resize, auto-fit)
back into the map immutably. The map is JSON-serializable, so persisting a user's column layout is one
two-way binding plus one storage write:

```ts
@Component({
  /* … */
  template: `
    <div forTable mode="grid" ariaLabel="People">
      <for-table-body [rows]="rows()" [rowKey]="rowKey" [(columnWidths)]="widths">
        <ng-container
          forColumnDef="name"
          resizable
          resizeAriaLabel="Resize Name"
          [resizeMin]="80"
          [resizeMax]="480"
        >
          <ng-template forHeaderCell>Name</ng-template>
          <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
        </ng-container>
        <!-- … -->
      </for-table-body>
    </div>
  `,
})
export class PeopleTable {
  // Seed from storage; write back whenever it changes.
  readonly widths = signal<Record<string, number>>(
    JSON.parse(localStorage.getItem('people.widths') ?? '{}'),
  );

  constructor() {
    effect(() => localStorage.setItem('people.widths', JSON.stringify(this.widths())));
  }
}
```

Only `resizable` columns participate; unknown names are ignored. Together with `[displayedColumns]` and
`[sort]`, `[(columnWidths)]` makes the full user-configurable table state three bindings. Prefer
`(resizeCommit)` when you only need the gesture-end event (e.g. to write a single column to a server)
rather than the whole width map.

### `[width]` vs. a resized / seeded width (column track precedence)

`<for-table-body>` resolves each column's `grid-template-columns` track as
`[width]() ?? var(--for-table-col-<name>-width, [fallbackWidth]() ?? minmax(0, 1fr))`, so a **static `[width]` on the def
takes precedence** over the published resize var — a seeded or resized width would never reach the
track. A column you resize (or seed through `[(columnWidths)]`) must therefore **leave `[width]`
unset**: it then flexes as `minmax(0, 1fr)`, sharing the free space with the other unsized columns,
until a width is seeded or committed — after which its track becomes that fixed pixel width and the
remaining `1fr` columns re-split what's left. Reserve `[width]` for columns you never resize (a fixed
`48px` selection column, an `80px` id column); combining it with `resizable` on the same column pins the
track and makes the handle's width purely advisory (`aria-valuenow` and `(resizeCommit)` still fire, but
the column does not visually resize).

### `[fallbackWidth]` — a weighted fluid track before the first resize

`minmax(0, 1fr)` is a fine default but it is the _only_ track an unsized column could take, so a column
that should fill proportionally **and** keep a floor had to choose between a fluid track and a resizable
one. `[fallbackWidth]` supplies the track fragment used as the **resize var's fallback** instead:

```html
<ng-container
  forColumnDef="description"
  resizable
  resizeAriaLabel="Resize description"
  fallbackWidth="minmax(120px, 2.5fr)"
>
  <ng-template forHeaderCell>Description</ng-template>
  <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.description }}</ng-template>
</ng-container>
```

The column renders as `minmax(120px, 2.5fr)` — 2.5× the weight of a plain `1fr` sibling, never below
`120px` — until a width is seeded or committed, at which point `--for-table-col-description-width`
resolves and the fallback stops applying, exactly as with the default. Unlike `[width]` it never pins the
column, so the handle keeps driving it.

`[fallbackWidth]` is **ignored when `[width]` is set** (the static track wins before the var is ever
consulted). It is _not_ gated on `resizable`: a non-`resizable` column with no `[width]` resolves through
the same var, which `[(columnWidths)]` can publish, so a weighted fluid track is equally useful there.

Both inputs are **dev-mode-guarded**, the same way a column name is. Any open track vocabulary is
accepted (`minmax()`, `fit-content()`, `calc()`, `clamp()`, `var()`), but a fragment that would escape the
derived `grid-template-columns` string throws a `[forty-cdk/table]` error instead of silently collapsing
the layout: an empty fragment (pass `null` — or omit the input — to leave the track unset), a `;` / `{` /
`}` / quote / comment opener, or unbalanced parentheses. That last one is the reason the guard exists at
all for `[fallbackWidth]`: a stray `)` closes the enclosing `var(` early and swallows every column after
it, which reads as "the whole table lost its layout" rather than "one column has a typo". Production
builds skip the check.

## Column reordering (`reorderable` + `columnReorder`)

Mark a column `reorderable` and `<for-table-body>` makes its header cell a drag-reorder handle. With at
least one `reorderable` column the body applies `[forTableColumnReorder]` to the stamped header row and
`[forDraggable]` (with `[dragData]` set to the column name) to each reorderable header cell, then
re-emits every committed reorder — pointer drop **or** keyboard drop — through `(columnReorder)`. Like
`sort`, reorder is **BYO-data**: the body never reorders the columns itself. Apply
`$event.columns` to your own column order and feed it back through `[displayedColumns]`.

```html
<div forTable mode="grid" ariaLabel="People">
  <for-table-body
    [rows]="rows()"
    [displayedColumns]="order()"
    (columnReorder)="order.set($event.columns)"
  >
    <ng-container forColumnDef="name" sortable reorderable>
      <ng-template forHeaderCell>Name</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
    </ng-container>
    <ng-container forColumnDef="role" reorderable>
      <ng-template forHeaderCell>Role</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
    </ng-container>

    <!-- Optional: one shared placeholder for the reordered column's slot during a pointer drag. -->
    <ng-template forColumnDragPlaceholder>
      <div class="col-ghost"></div>
    </ng-template>
  </for-table-body>
</div>
```

```ts
protected readonly order = signal<readonly string[]>(['name', 'role']);
```

- **Keyboard is inherited, not new:** the header row keeps its single composite tab stop, `Space` lifts
  a header cell for reordering, and Arrow keys move the lifted column (`Escape` cancels). On a header
  that is **both** `sortable` and `reorderable`, the two split along WAI-ARIA lines — `Space` lifts,
  `Enter` toggles the sort — so a single key never both sorts and reorders.
- **`(columnReorder)`** emits `{ from, to, columns }` (a `TableColumnReorderDescriptor`). Its `columns`
  lists the **reorderable** columns in their new order — equal to the full displayed order when every
  displayed column is `reorderable`. Non-reorderable columns stay static (not draggable) and keep their
  slots, so a table that mixes them merges the reorderable subset back into its own full order.
- **`forColumnDragPlaceholder`** is optional and declared **once per body**; it is stamped as every
  reorderable column's pointer-drag placeholder. Omit it to keep drag-drop's default placeholder.
- This is the declarative twin of the raw `[forTableColumnReorder]` / `[forDraggable]` composition; it
  bundles `forty-cdk/drag-drop` (~14 KB gz) into every `<for-table-body>` — see the bundle note above.

## Virtualized rows

Add `[forTableVirtualized]` to the same `[forTable]` element and the body switches to windowed rendering
automatically — it reads the published window off the table context (so `forty-cdk/table` still never
imports the virtualization core), mounts only the visible slice, sizes its rowgroup to the full scroll
height, and absolutely positions each row. Pass the **whole dataset** to `[rows]` — the body derives the
true total from its length, so `[rowCount]` on `[forTable]` is unnecessary (bind it only for a
server-known total larger than the loaded rows). There is no `#v` reference, manual sizer, `@for`
window, or `[virtualIndex]` binding. Rows are fixed-size by default — set the row height in CSS. For
tables that mix row shapes (denser variant rows, group separators), opt in to
[measured row heights](#measured-variable-row-heights) with `measureRows`.

The `mode="grid"` in the example below is a **convention, not a requirement** of the layer. Windowing is
driven by the `<div>` structure `<for-table-body>` always renders — not by the ARIA mode — so
`mode="table"` windows the same way: the root keeps `role="table"`, stamped cells stay `role="cell"`,
and only the visible slice mounts.

```html
<div
  class="scroll-root"
  forTable
  forTableVirtualized
  mode="grid"
  ariaLabel="People"
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

### Measured (variable) row heights

The fixed-size fast path positions every row at `estimateRowSize` intervals — perfect when all rows are
the same height, but a table mixing row shapes (denser variant rows, group separators, summary rows)
would show overlaps or gaps after scroll, because the estimate is wrong for the odd-sized rows. Set
`measureRows` to opt in to measured heights: the body measures each stamped row after render and feeds
its real height back to the virtualizer, which replaces the estimate and re-aligns the offsets of the
rows below — so the window stays contiguous no matter how the row heights vary.

```html
<div class="scroll-root" forTable forTableVirtualized mode="grid" ariaLabel="People">
  <for-table-body [rows]="rows()" [rowKey]="rowKey" measureRows>
    <ng-container forColumnDef="name">
      <ng-template forHeaderCell>Name</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
    </ng-container>

    <ng-container forRowDef [when]="isGroupHeader">
      <ng-template forRowCell [forRowCellRow]="rows()" let-row>{{ row.group }}</ng-template>
    </ng-container>
  </for-table-body>
</div>
```

`estimateRowSize` still seeds the initial estimate (keep it close to the common row height for the least
scroll-position shift on first measure). `measureRows` is off by default and has no effect without
`[forTableVirtualized]`; a uniform-height table should leave it unset to keep the zero-measurement fast
path. This mirrors the raw `[forTableRow]` path's `v.measureRow(el)` — the declarative layer just wires
it up for you.

Initial measurement happens once, after a row renders. Ongoing in-place size changes to a row that
stays mounted — content that loads asynchronously (images, lazy cells), a cell that reflows — are picked
up automatically by the virtualizer's own `ResizeObserver`, which re-measures the row and re-aligns the
rows below without any manual trigger. So a row that grows in place after its data arrives keeps the
window contiguous on its own; you only pass the data through `[rows]`.

## Row variants

Declare one or more `[forRowDef]` alongside the columns to render a **full-span row** for the data it
matches — group headers, section separators, full-width summary or empty-state rows. For each datum the
body picks the first `[forRowDef]` whose `[when]` predicate returns `true` and stamps a row whose single
cell spans every column and renders the `[forRowCell]` template; unmatched data renders the standard
per-column row. (A `[forRowDef]` can instead carry the `placeholderCells` flag — no `[forRowCell]` — to
stamp per-column skeleton cells rather than a full-span cell; see
[Interleaved placeholder rows](#interleaved-placeholder-rows).) Type `let-row` by binding
`[forRowCellRow]` to the same array you pass to `[rows]` — and,
for a discriminated-union row type, narrow it with `[forRowCellWhen]` / `[forDataCellUnless]` (see
[Typing a discriminated-union row](#typing-a-discriminated-union-row)).

Variant rows are **presentational**: the spanning cell carries the row `role` (`gridcell` in grid /
treegrid mode), `aria-colindex="1"`, and `aria-colspan` equal to the column count, but it does **not**
join the roving 2D navigation grid — arrow keys move between the regular data cells and step over variant
rows — and variant rows are non-selectable. They still occupy a row slot and count towards
`aria-rowindex` / `aria-rowcount` (reading order is preserved). Style them off the `data-row-variant`
hook the spanning cell emits. Row variants compose with `[forTableVirtualized]` — a matched row inside
the window renders full-span and positioned like any other.

Three requirements when a table mixes row variants with selection or virtualization:

- **`rowKey` must return a defined, unique key for variant data too.** The body tracks each rendered
  row by its `rowKey` identity, falling back to the dataset index only when `rowKey` is unset or returns
  `undefined`. A variant datum that yields `undefined` therefore tracks by index, which can collide with
  a numeric identity from a regular row and trip Angular's `NG0955` duplicate-track-key error. Give
  group-header / separator data their own stable keys — the simplest scheme is a **negative-id**
  namespace reserved for variant data, disjoint from the positive ids the real rows carry (see the `ts`
  block below).
- **Exclude variant-matched data from `[selectableValues]`.** The
  [total-aware select-all pattern](../projects/forty-cdk/table/README.md#total-aware-aggregates-under-virtualization-selectablevalues) passes
  the whole dataset as `[selectableValues]`. Variant rows are non-selectable, so leaving their data in
  makes them phantom selectable values: the select-all tri-state never reaches `'all'` and `[(value)]`
  accumulates values no row reflects. Filter them out with the same predicate the `[forRowDef]` matches
  on (e.g. `rows().filter((r) => !isGroupHeader(r))`).
- **Keep the `[forRowCell]` template presentational.** Its content spans the row but stays out of the
  grid's single tab stop, so it must contain no interactive content (buttons, links, form controls —
  they become keyboard-unreachable) and no `[forTableCell]` (it would register a cell handle on the
  variant row and make the roving grid ragged).

```html
<div forTable mode="grid" ariaLabel="Grouped people">
  <for-table-body [rows]="rows()" [rowKey]="rowKey">
    <ng-container forColumnDef="name">
      <ng-template forHeaderCell>Name</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
    </ng-container>
    <ng-container forColumnDef="role">
      <ng-template forHeaderCell>Role</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.role }}</ng-template>
    </ng-container>

    <ng-container forRowDef [when]="isGroupHeader">
      <ng-template forRowCell [forRowCellRow]="rows()" let-row>{{ row.group }}</ng-template>
    </ng-container>
  </for-table-body>
</div>
```

```ts
interface Row {
  id: number;
  name?: string;
  group?: string;
  header?: boolean;
}

protected readonly isGroupHeader = (row: Row): boolean => row.header === true;

// Group-header data carry negative ids, disjoint from the real rows' positive ids,
// so every datum — variant or not — has a defined, unique tracking key.
protected readonly rowKey = (row: Row): number => row.id;

// Total-aware select-all excludes the non-selectable variant rows.
protected readonly selectableIds = computed(() =>
  this.rows()
    .filter((r) => !this.isGroupHeader(r))
    .map((r) => r.id),
);
```

```css
[data-row-variant] {
  grid-column: 1 / -1; /* already applied inline; restate only to layer your own styles */
  font-weight: 600;
  background: var(--group-header-bg);
}
```

## Interleaved placeholder rows

`[loading]` is the **full-replace** skeleton: it swaps the whole dataset for `[placeholderRows]`
skeleton rows built from each column's `[forPlaceholderCell]` — the right shape for the _initial_ load,
when there are no rows yet.

Paginated / infinite-scroll tables load differently: they keep the rows already loaded and show a few
**trailing** (or interleaved) skeleton rows while the next page fetches. Model that with a
`placeholderCells` [row variant](#row-variants) — a `[forRowDef]` that matches your placeholder data and
stamps one skeleton cell per column from the same `[forPlaceholderCell]` templates, in place among the
real rows:

- The matched rows are **non-selectable**, and their cells are stamped **disabled** — so grid-mode arrow
  navigation steps over them while the roving grid stays rectangular (one cell per column, unlike a
  full-span variant).
- A column that omits `[forPlaceholderCell]` falls back to the body-level
  [`[forPlaceholderCellDefault]`](#shared-skeleton-forplaceholdercelldefault), then to an empty cell —
  so you mark only the columns whose skeleton shape differs from the shared one (a circle for an avatar
  column, a bar for text).
- It composes with `[forTableVirtualized]` for free: placeholder rows are ordinary data — they count in
  the total and get windowed and positioned like any row.

A `[forRowDef]` must declare **exactly one** of a `[forRowCell]` template (full-span variant) or the
`placeholderCells` flag; declaring both or neither throws a `[forty-cdk/table]` error. `[loading]` /
`[placeholderRows]` stay unchanged as the sugar for the initial full-replace state.

```html
<for-table-body [rows]="rows()" [rowKey]="rowKey">
  <ng-container forColumnDef="avatar" width="48px">
    <ng-template forHeaderCell></ng-template>
    <ng-template forDataCell [forDataCellRow]="rows()" let-row>
      <img [src]="row.avatar" alt="" />
    </ng-template>
    <!-- circle skeleton for the avatar column -->
    <ng-template forPlaceholderCell><span class="skeleton skeleton--circle"></span></ng-template>
  </ng-container>

  <ng-container forColumnDef="name">
    <ng-template forHeaderCell>Name</ng-template>
    <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
    <!-- bar skeleton for the text column -->
    <ng-template forPlaceholderCell><span class="skeleton skeleton--bar"></span></ng-template>
  </ng-container>

  <!-- trailing skeleton rows appended to rows() while the next page loads -->
  <ng-container forRowDef [when]="isPlaceholder" placeholderCells />
</for-table-body>
```

```ts
interface Row {
  id: number;
  name?: string;
  avatar?: string;
  pending?: boolean;
}

// Match the placeholder rows you appended to rows() while fetching the next page.
protected readonly isPlaceholder = (row: Row): boolean => row.pending === true;

// A placeholder datum still needs a defined, unique rowKey (a negative-id namespace, say),
// exactly like a full-span variant — see the Row variants requirements above.
protected readonly rowKey = (row: Row): number => row.id;
```

### Shared skeleton: `[forPlaceholderCellDefault]`

Most columns of a table share one skeleton shape, and repeating the same `[forPlaceholderCell]` in every
def is duplication for what is a table-level concern. Declare it **once per body** on an
`<ng-template forPlaceholderCellDefault>` among the column defs; every displayed column that declares no
`[forPlaceholderCell]` of its own stamps it instead.

Each cell resolves its placeholder in three steps, identically in **both** stamping paths (`[loading]`
rows and `placeholderCells` variant rows):

1. the column's own `[forPlaceholderCell]`, if it has one;
2. else the body-level `[forPlaceholderCellDefault]`, if declared;
3. else an empty cell.

So the default never overrides a column that opted into its own shape, and a table with neither template
keeps the empty cell it rendered before. The default takes no template context, exactly like the
per-column template.

```html
<for-table-body [rows]="rows()" [rowKey]="rowKey" [loading]="loading()">
  <!-- the shape 6 of these 7 columns share -->
  <ng-template forPlaceholderCellDefault><span class="skeleton skeleton--bar"></span></ng-template>

  <ng-container forColumnDef="avatar" width="48px">
    <ng-template forHeaderCell></ng-template>
    <ng-template forDataCell [forDataCellRow]="rows()" let-row
      ><img [src]="row.avatar" alt=""
    /></ng-template>
    <!-- this one column overrides it -->
    <ng-template forPlaceholderCell><span class="skeleton skeleton--circle"></span></ng-template>
  </ng-container>

  <ng-container forColumnDef="name">
    <ng-template forHeaderCell>Name</ng-template>
    <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
  </ng-container>
</for-table-body>
```

## Whole-row navigation lists

Some tables are navigation lists: the **whole row** is the interactive target — click or `Enter` opens
a detail view, an optional right-click opens a context menu. Because `<for-table-body>` owns the
`[forTableRow]` element, it exposes the row-level interaction as inputs / outputs rather than letting
you attach handlers to a row you don't author. Set `interactiveRows` and bind `(rowActivate)` — each
data row becomes a focusable tab stop (`tabindex="0"`), and a pointer click or `Enter` emits the row
datum, its dataset index, and the originating event. Bind `(rowContextMenu)` for the right-click / menu
key. These are **scoped to the default `mode="table"`**: `role="grid"` announces a cell-interaction
model a navigation list does not have, and whole-row activation would clash with grid roving navigation
and cell-entry. Full-span `[forRowDef]` variant rows stay non-interactive.

```html
<div forTable mode="table" ariaLabel="Requests">
  <for-table-body
    [rows]="rows()"
    [rowKey]="rowKey"
    interactiveRows
    [rowClass]="rowClass"
    (rowActivate)="openDetail($event.row)"
    (rowContextMenu)="openRowMenu($event)"
  >
    <ng-container forColumnDef="name">
      <ng-template forHeaderCell>Name</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
    </ng-container>
    <ng-container forColumnDef="status">
      <ng-template forHeaderCell>Status</ng-template>
      <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.status }}</ng-template>
    </ng-container>
  </for-table-body>
</div>
```

```ts
protected openDetail(row: Row): void {
  this.router.navigate(['/requests', row.id]);
}

protected openRowMenu(event: TableRowContextMenuEvent<Row>): void {
  event.event.preventDefault();
  this.menu.openAt(event.event, event.row);
}

// Highlight the row whose context menu is open (see [rowClass] below).
protected readonly menuRow = signal<Row | null>(null);
protected readonly rowClass = (row: Row): Record<string, boolean> => ({
  'row-menu-open': row.id === this.menuRow()?.id,
});
```

The full-row hit target includes the gaps between cells — clicking anywhere on the row activates it,
unlike a click handler on each cell. A row context menu opened with the keyboard (the context-menu key
or `Shift+F10`) fires on the focused element, so gating both hooks behind `interactiveRows` keeps the
menu keyboard-reachable.

**Interactive content in a data cell owns its own events.** A per-row action `<button>` (or `<a href>`,
`<input>`, `<select>`, `<textarea>`, `<summary>`, or `contenteditable` element) in a trailing column is
the common navigation-list shape — clicking it runs the control, and pressing `Enter` on it keeps its
native action, without _also_ firing `(rowActivate)`. The row still activates from everywhere else: cell
text, the gaps between cells, and the focused row itself. `(rowContextMenu)` is the deliberate exception
— a right-click anywhere on the row, including over an inner control, still offers the row's context
menu, matching native list UIs.

```html
<ng-container forColumnDef="actions">
  <ng-template forHeaderCell>Actions</ng-template>
  <ng-template forDataCell [forDataCellRow]="rows()" let-row>
    <!-- Click / Enter here runs the button; the row is not activated. -->
    <button type="button" (click)="editRow(row)">Edit</button>
  </ng-template>
</ng-container>
```

### Styling a row from its datum (`[rowClass]` / `[rowAttrs]`)

`[headerClass]` / `[cellClass]` on `[forColumnDef]` style a stamped **cell** by column, but a row's
appearance often depends on its **data** — an error row, a dimmed row, the "menu-open" highlight above.
`[rowClass]` and `[rowAttrs]` are the seam for that: both take a `(row, index) => …` function the body
calls per stamped row, and — unlike the activation hooks — apply in **every** mode (grid tables need
per-datum row styling just as much) and to **both** data and variant rows.

- **`[rowClass]`** returns a class string or a `{ className: boolean }` map, applied to the row host.
- **`[rowAttrs]`** returns an attribute map applied to the row host; a key mapped to `null` (or dropped
  from a later map) removes that attribute — useful for `aria-current`, `data-*` state, etc.

```html
<for-table-body [rows]="rows()" [rowKey]="rowKey" [rowClass]="rowClass" [rowAttrs]="rowAttrs">
  …
</for-table-body>
```

```ts
protected readonly rowClass = (row: Row): Record<string, boolean> => ({
  'row-error': row.status === 'error',
  'row-dimmed': row.archived,
});
protected readonly rowAttrs = (row: Row): Record<string, string | null> => ({
  'aria-current': row.id === this.activeId() ? 'true' : null,
});
```

## Typing a discriminated-union row

When rows are a discriminated union whose variant members render through a `[forRowDef]`, `let-row`
would otherwise type as the full union in every template — a per-column `[forDataCell]` only ever
receives the non-variant members, and a `[forRowCell]` only ever receives its matched variant. Bind
the **same type guard** you use on the def's `[when]` to the compiler-only inference inputs so each
`let-row` is narrowed to exactly what it receives:

- **`[forDataCellUnless]`** on a `[forDataCell]` narrows `let-row` to `Exclude<Row, V>` — the members
  _not_ rendered as a variant. Compose several variants into one union guard.
- **`[forRowCellWhen]`** on a `[forRowCell]` narrows `let-row` to the matched variant `V`.

Both are read only by the compiler, exactly like `[forDataCellRow]` / `[forRowCellRow]`; omitting them
leaves `let-row` as the full row type (no behavioural or type change for existing tables). This
replaces the filtered-computed-per-template workaround (`dataRows()` / `separatorRows()` copies of
`rows()` kept only to satisfy the compiler) — bind `rows()` directly and let the guard narrow.

```ts
interface DataRow {
  kind: 'data';
  name: string;
  amount: number;
}
interface SeparatorRow {
  kind: 'separator';
  label: string;
}
type Row = DataRow | SeparatorRow;

protected readonly isSeparator = (row: Row): row is SeparatorRow => row.kind === 'separator';
```

```html
<for-table-body [rows]="rows()">
  <ng-container forColumnDef="name">
    <ng-template forHeaderCell>Name</ng-template>
    <!-- row: DataRow -->
    <ng-template forDataCell [forDataCellRow]="rows()" [forDataCellUnless]="isSeparator" let-row>
      {{ row.name }} — {{ row.amount }}
    </ng-template>
  </ng-container>

  <ng-container forRowDef [when]="isSeparator">
    <!-- row: SeparatorRow -->
    <ng-template forRowCell [forRowCellRow]="rows()" [forRowCellWhen]="isSeparator" let-row>
      {{ row.label }}
    </ng-template>
  </ng-container>
</for-table-body>
```

## Wrapping the declarative body

A design system layered on forty eventually wants to hide the low-level defs behind its own
authoring shapes: a **preset column component** collapsing a column's header / data / placeholder
templates into one line, and a **scaffold wrapper table** that bakes in the `[forTable]` root,
virtualization wiring and shared row defs so a consumer only declares columns. Both work, because
`<for-table-body>` does **not** content-query its building blocks: each `[forColumnDef]`,
`[forRowDef]`, `[forColumnDragPlaceholder]` and `[forPlaceholderCellDefault]` **registers itself**
with the surrounding def registry through DI at construction (and unregisters when destroyed).

Registered defs are exposed in **document order**, so a def that constructs late — one declared in a
preset's view, one mounted by `@if` — still renders in its authored place, and `[displayedColumns]`
still pins an explicit order on top. A def with no reachable registry throws a `[forty-cdk/table]`
error instead of being silently inert.

### Preset column component

Element DI follows the **declaration** tree, so a preset host declared inside the body's tags lets
the def in the preset's own view resolve the body's registry. No providers, no registration code:

```ts
import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ForColumnDef, ForDataCell, ForHeaderCell } from 'forty-cdk/table';

@Component({
  selector: 'ds-text-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForColumnDef, ForHeaderCell, ForDataCell],
  template: `
    <ng-container [forColumnDef]="name()" [sortable]="sortable()" [width]="width()">
      <ng-template forHeaderCell>{{ header() }}</ng-template>
      <ng-template forDataCell let-row>{{ value()(row) }}</ng-template>
    </ng-container>
  `,
})
export class DsTextColumn<T> {
  readonly name = input.required<string>();
  readonly header = input.required<string>();
  readonly value = input.required<(row: T) => unknown>();
  readonly sortable = input(false, { transform: booleanAttribute });
  readonly width = input<string | null>(null);
}
```

```html
<div forTable mode="grid" ariaLabel="People">
  <for-table-body [rows]="rows()" [rowKey]="rowKey">
    <ds-text-column name="code" header="Code" [value]="pickCode" width="8rem" />
    <ds-text-column name="name" header="Name" [value]="pickName" sortable />
  </for-table-body>
</div>
```

### Scaffold wrapper table

Defs a consumer projects through the wrapper's `<ng-content>` are content of the **wrapper**, not of
the `<for-table-body>` inside the wrapper's template — their declaration ancestors are the wrapper's
host, so they never see the body's own registry. Provide one on the wrapper with
`provideForTableDefRegistry()` and hand it to the inner body through `[defs]`:

```ts
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import {
  FOR_TABLE_DEF_REGISTRY,
  ForTable,
  ForTableBody,
  provideForTableDefRegistry,
} from 'forty-cdk/table';

@Component({
  selector: 'ds-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: provideForTableDefRegistry(),
  imports: [ForTable, ForTableBody],
  template: `
    <div forTable mode="grid" [ariaLabel]="ariaLabel()">
      <for-table-body [rows]="rows()" [rowKey]="rowKey()" [defs]="defs">
        <ng-content />
      </for-table-body>
    </div>
  `,
})
export class DsDataTable<T> {
  readonly rows = input.required<readonly T[]>();
  readonly rowKey = input<(row: T, index: number) => unknown>();
  readonly ariaLabel = input.required<string>();
  protected readonly defs = inject(FOR_TABLE_DEF_REGISTRY);
}
```

```html
<ds-data-table [rows]="rows()" [rowKey]="rowKey" ariaLabel="People">
  <ng-container forColumnDef="name" sortable>
    <ng-template forHeaderCell>Name</ng-template>
    <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
  </ng-container>
</ds-data-table>
```

Three rules for the scaffold shape:

- **A bound `[defs]` replaces the body's own registry.** Defs the wrapper declares **inside** the
  `<for-table-body>` tags would register with the body instead and be ignored, so the body throws
  rather than dropping them. Declare the wrapper's own baked-in defs (a shared placeholder row def,
  a fixed actions column) next to the projected ones — anywhere in the wrapper's template outside
  the `<for-table-body>` element — where they reach the same registry and interleave with the
  projected defs by document order.
- **`FOR_TABLE_DEF_REGISTRY` is a read token.** `ForTableDefRegistry` exposes `columnNames` (every
  registered column's `name`, in document order — useful to derive the wrapper's own
  `[displayedColumns]`); the registration protocol behind it is internal, so only the registry
  `provideForTableDefRegistry()` installs is accepted by `[defs]`.
- **Compose the body, don't subclass it.** A component subclass replaces its base's `providers`
  wholesale, which strips the registry the defs resolve — the body throws a `[forty-cdk/table]`
  error naming `provideForTableDefRegistry()` rather than a bare `NG0201` naming a class you
  cannot import. Spreading the helper in is not the fix, though: a subclass inherits neither
  `template` nor `imports` either, so it constructs and then renders none of the body. Composition
  is the whole wrapping story here.
