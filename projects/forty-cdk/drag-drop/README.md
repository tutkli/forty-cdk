# Drag & Drop

Headless accessible drag-and-drop for sortable lists and cross-list item
transfers. Supports both keyboard and pointer (mouse / touch / pen) dragging.

For repositioning an arbitrary element (no list, no reorder) — e.g. dragging a
whole dialog around by its header — see [`[forFreeDrag]`](#free-drag-forfreedrag).

## Keyboard model

| State  | Key         | Action                                     |
| ------ | ----------- | ------------------------------------------ |
| Idle   | Arrow keys  | Move roving focus between items            |
| Idle   | Home / End  | Jump to first / last item                  |
| Idle   | Space/Enter | **Lift** the focused item                  |
| Lifted | Arrow keys  | Step the logical drop position             |
| Lifted | Space/Enter | **Drop** (commits and emits `(dragDrop)`)  |
| Lifted | Escape      | **Cancel** (no event, focus stays on item) |

Arrow direction follows the list's `orientation` and respects RTL via `dir`. In
`orientation="mixed"` every arrow key steps the lifted item linearly in DOM order.

## Pointer dragging

When a pointer drag starts, the dragged item stays in place and reflects
`data-dragging` (style it as a dimmed gap). A fixed-position clone of the item
follows the pointer as the default preview. The clone carries
`data-for-drag-preview` and `aria-hidden="true"`.

### Auto-scroll

While a pointer drag is in flight, `[forDropList]` automatically scrolls the
nearest scrollable container (the list itself, a scrollable ancestor, or the
viewport) toward whichever edge the pointer approaches. Speed scales with
proximity — the closer the pointer is to the edge, the faster the scroll.

The feature is **on by default**. Opt out with `[autoScroll]="false"`:

```html
<ul forDropList [autoScroll]="false" (dragDrop)="onDrop($event)">
  …
</ul>
```

Configure the edge zone and max speed via `provideForDragDropDefaults`:

```ts
providers: [
  provideForDragDropDefaults({
    autoScrollEdgeSize: 80,
    autoScrollMaxSpeed: 24,
  }),
];
```

Keyboard dragging is unaffected. SSR-safe — no-op when there is no browser window.

### Optional drag handle

Apply `[forDragHandle]` on a child element of `[forDraggable]` to restrict
where a pointer gesture may start. Once any handle is present on an item,
pointer drags may only begin from within that handle — keyboard dragging is
unaffected.

```html
<li forDraggable [dragData]="item">
  <span forDragHandle aria-hidden="true">::</span>
  {{ item.label }}
</li>
```

### Custom preview & placeholder

Place `<ng-template forDragPreview>` and/or `<ng-template forDragPlaceholder>` as direct
children of `[forDraggable]` to override the default drag visuals during a pointer drag.

```html
<li forDraggable [dragData]="item">
  {{ item.label }}
  <ng-template forDragPreview>
    <div class="my-preview">{{ item.label }}</div>
  </ng-template>
  <ng-template forDragPlaceholder>
    <div class="my-placeholder"></div>
  </ng-template>
</li>
```

- **`[forDragPreview]`** replaces the default cloned floating element that follows the pointer
  during a pointer drag. Applies to pointer drags only; keyboard dragging is unaffected.
- **`[forDragPlaceholder]`** renders in the dragged item's slot while a pointer drag is in flight.
  The dragged item's host is hidden (`display: none`) and the placeholder template occupies its
  space, preserving the gap. When the drag ends (drop or cancel) the placeholder is removed and
  the item is revealed again. Keyboard dragging keeps the default behaviour — the lifted item
  stays in place reflecting `data-dragging`, and no placeholder is rendered.

### Live-sort placeholder

Add `[liveSort]="true"` to `[forDropList]` to make the `[forDragPlaceholder]` follow the live
resolved drop index during a pointer drag — within the list and across connected lists — so
siblings part to reveal where the item will land. When `false` (the default), the placeholder
stays in the dragged item's source slot.

```html
<ul forDropList [liveSort]="true" (dragDrop)="onDrop($event)">
  @for (item of items(); track item.id) {
  <li forDraggable [dragData]="item">
    {{ item.label }}
    <ng-template forDragPlaceholder>
      <div class="my-placeholder"></div>
    </ng-template>
  </li>
  }
</ul>
```

`[liveSort]` has no visible effect without a `[forDragPlaceholder]` template, and has no effect
on keyboard dragging.

### Boundary & axis lock

`[forDropList]` supports two opt-in visual constraints on the pointer-drag preview. Both are
`null` by default and have **no effect on keyboard dragging** (which has no floating preview).
Neither changes the resolved drop index — they constrain the visual preview only.

**`[boundary]`** — confine the preview within a boundary element. Accepts an `HTMLElement` or
a CSS selector string resolved via `closest()` from the list host. The preview box is clamped so
it stays fully inside the boundary. When the boundary is smaller than the preview on an axis,
the preview is pinned to the boundary's start edge on that axis.

**`[lockAxis]`** — constrain movement to one axis. `'x'` keeps the preview at its lift-time `y`
(horizontal-only movement); `'y'` keeps it at its lift-time `x` (vertical-only movement).

Both inputs may be combined:

```html
<div class="container" #container>
  <ul forDropList [boundary]="container" lockAxis="x" (dragDrop)="onDrop($event)">
    @for (item of items(); track item.id) {
    <li forDraggable [dragData]="item">{{ item.label }}</li>
    }
  </ul>
</div>
```

String selector form (resolved via `closest()` on the list host):

```html
<ul forDropList [boundary]="'.my-scroller'" (dragDrop)="onDrop($event)">
  …
</ul>
```

### Reorder & settle animations

Add `[animateReorder]="true"` to `[forDropList]` to animate committed drops. When enabled:

- **FLIP reorder** — displaced sibling items transition smoothly from their old positions to their
  new ones instead of snapping.
- **Drop-settle** — on a pointer drag, the floating preview transitions from its release position
  into the final item slot before it is removed.

Both are opt-in and fully skipped under `prefers-reduced-motion: reduce`. They work for both
keyboard and pointer drags. The library publishes the styling hooks below — duration / easing are
always provided by the consumer via CSS; the library imposes none.

```html
<ul forDropList [animateReorder]="true" (dragDrop)="onDrop($event)">
  …
</ul>
```

```css
[forDraggable][data-drag-animating] {
  transition: transform 200ms ease;
}
[data-for-drag-preview][data-settling] {
  transition: transform 200ms ease;
}
```

With no such CSS, `animateReorder` is a graceful no-op — transforms clear instantly and the
preview is destroyed promptly.

## Orientation

`[forDropList]` resolves the live drop index along its `orientation`:

- **`"vertical"`** (default) — a stacked column; the index is resolved by the pointer's `y`.
- **`"horizontal"`** — a single row; the index is resolved by the pointer's `x` (RTL-aware).
- **`"mixed"`** — a wrapping grid (`flex-wrap` / CSS grid) of **uniformly-sized** items. The index
  is resolved in 2D, so an item dragged across a wrapped row lands in the slot under the pointer's
  row **and** column instead of mis-resolving to the nearest single-axis slot. A `"mixed"` list that
  happens to render as a single row or single column resolves identically to `"horizontal"` /
  `"vertical"`.

```html
<ul class="grid" forDropList orientation="mixed" (dragDrop)="onDrop($event)">
  @for (item of items(); track item.id) {
  <li forDraggable [dragData]="item">{{ item.label }}</li>
  }
</ul>
```

```css
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

A wrapper can default the orientation for every `[forDropList]` in its scope via the
`FOR_DROP_LIST_DEFAULT_ORIENTATION` token (the same mechanism `ForTableColumnReorder` uses for
`"horizontal"`):

```ts
providers: [{ provide: FOR_DROP_LIST_DEFAULT_ORIENTATION, useValue: 'mixed' }];
```

`"mixed"` targets regular grids of uniformly-sized items; variable-size / masonry layouts are out of
scope. `[animateReorder]` (FLIP) reflows by DOM order and needs no change in mixed mode.

## Free drag (`[forFreeDrag]`)

`[forFreeDrag]` repositions its host element (or a resolved `rootElement`) by pointer drag, with
**no `[forDropList]` required** — it never commits a reorder, it just moves the element around via a
CSS `transform: translate(...)`. It is the standalone counterpart to a sortable list item: a
pointer-driven way to move an element freely, with optional root-element retargeting, a confinement
boundary, axis locking, and a controllable position (see the inputs below).

```html
<!-- move the whole dialog by its header -->
<div class="dialog">
  <header forFreeDrag rootElement=".dialog" boundary=".viewport">Drag me</header>
  …
</div>

<!-- or with an explicit handle and a controllable position -->
<div forFreeDrag [(position)]="pos" boundary=".viewport">
  <span forDragHandle aria-hidden="true">⠿</span>
  …
</div>
```

| Input         | Type                            | Default       | Meaning                                                                                            |
| ------------- | ------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `disabled`    | `boolean`                       | `false`       | When true, the element can't be dragged (it stays focusable; the transform doesn't change).        |
| `rootElement` | `HTMLElement \| string \| null` | `null`        | The element actually moved. A `closest()` selector resolves an ancestor. `null` moves the host.    |
| `boundary`    | `HTMLElement \| string \| null` | `null`        | Confine the moved element fully inside this element (or `closest()` selector). `null` = unbounded. |
| `lockAxis`    | `'x' \| 'y' \| null`            | `null`        | Constrain movement to one axis. `'x'` pins lift-time `y`, `'y'` pins lift-time `x`.                |
| `position`    | `model<{ x; y }>`               | `{ x:0,y:0 }` | Two-way translate offset (px) from the element's natural position. Controllable / restorable.      |

| Output      | Payload    | Fires                                                                                          |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `dragStart` | `{ x; y }` | When a pointer drag starts (the lift-time position).                                           |
| `dragMove`  | `{ x; y }` | On every armed move, with the live position.                                                   |
| `dragEnd`   | `{ x; y }` | When the drag ends (commit keeps the position; cancel/Escape restores the lift-time snapshot). |

`[forDragHandle]` works inside `[forFreeDrag]` exactly as it does inside `[forDraggable]`: once any
handle is present, a pointer drag may only start from within a handle.

**Accessibility.** Free-drag is **pointer-only** — there is no WAI-ARIA pattern for "reposition an
element", so it owns no role or ARIA state. The consumer is responsible
for keeping the moved element fully usable at its default position (e.g. a repositionable dialog must
still be operable by keyboard); dragging is a pointer convenience, not the only way to use it.

## Virtualized lists

Dragging the rows of a **virtualized** list (one whose off-screen rows are
recycled out of the DOM) is supported through two opt-in companions:

- a **table** — [`[forTableRowReorder]`](../table/README.md#reordering-under-virtualization)
  composed with `[forTableVirtualized]`, and
- a **plain `*forVirtualFor` list** — `[forVirtualReorder]` composed with
  `[forVirtualViewport]` (see `forty-cdk/virtualization`).

A bare `[forDropList]` wrapping `*forVirtualFor` is **not** supported on its own:
it only ever registers the rows currently rendered in the window, so it

- emits **window-relative** `previousIndex` / `currentIndex` (applying
  `moveItemInArray` over your full array reorders the wrong rows),
- lets the lifted row get **recycled out from under the drag** when auto-scroll
  moves the window, and
- confines keyboard stepping to the **rendered window**, so it can't traverse the
  dataset.

Both companions solve all three: they translate window-relative to absolute
dataset indices (so `moveItemInArray` over the full array moves the right item),
pin the lifted row so auto-scroll never recycles it mid-drag, and step the
keyboard target over the true total count. Holding **Shift** during a pointer drag
additionally engages **windowed scrub**: the scroll viewport maps onto the whole
dataset (top edge → first item, bottom edge → last), so one gesture drops the
lifted row at an arbitrary far item without auto-scroll having to reach it.

```html
<div
  forVirtualViewport
  [virtualCount]="rows().length"
  forVirtualReorder
  (itemReorder)="onReorder($event)"
>
  <div *forVirtualFor="let row of rows()" forDraggable [dragData]="row.id">{{ row.label }}</div>
</div>
```

```ts
onReorder({ from, to }: ForVirtualReorderEvent): void {
  this.rows.update((rows) => moveItemInArray(rows, from, to));
}
```

A custom integration that cannot use either companion must supply the same three
mechanisms itself: map window-relative to absolute indices with the reusable
`translateWindowReorder` helper (`forty-cdk/core`), keep the lifted row mounted
for the duration of the drag, and step the keyboard target over the true total
count. See [`docs/drag-in-virtualized-list-spike.md`](../../../docs/drag-in-virtualized-list-spike.md)
for the full analysis.

## Data attributes

| Attribute               | Element           | Meaning                                                                              |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| `data-orientation`      | `[forDropList]`   | `"vertical"`, `"horizontal"`, or `"mixed"`                                           |
| `data-disabled`         | both              | Present when the item or list is disabled                                            |
| `data-disabled`         | `[forFreeDrag]`   | Present when the free-drag element is disabled                                       |
| `data-dragging`         | `[forDropList]`   | Present while a drag originates here                                                 |
| `data-dragging`         | `[forDraggable]`  | Present while this item is lifted                                                    |
| `data-dragging`         | `[forFreeDrag]`   | Present while a free-drag pointer gesture is armed                                   |
| `data-drag-over`        | `[forDropList]`   | Present while this list is the drop target                                           |
| `data-drag-handle`      | `[forDragHandle]` | Present on every registered drag handle                                              |
| `data-for-drag-preview` | preview element   | Present on the default clone preview **or** the `[forDragPreview]` template wrapper  |
| `data-drag-animating`   | `[forDraggable]`  | Present while the item's FLIP reorder transition plays (requires `[animateReorder]`) |
| `data-settling`         | preview element   | Present while the drop-settle transition plays (requires `[animateReorder]`)         |

## Sortable list

```html
<ul forDropList (dragDrop)="onDrop($event)">
  @for (item of items(); track item.id) {
  <li forDraggable [dragData]="item">{{ item.label }}</li>
  }
</ul>
```

```ts
onDrop(event: ForDragDropEvent<MyItem>): void {
  this.items.set(
    moveItemInArray(this.items(), event.previousIndex, event.currentIndex),
  );
}
```

## Two-list transfer with `forDropListGroup`

```html
<div forDropListGroup>
  <ul forDropList (dragDrop)="onDrop($event)">
    @for (item of active(); track item.id) {
    <li forDraggable [dragData]="item">{{ item.label }}</li>
    }
  </ul>
  <ul forDropList (dragDrop)="onDrop($event)">
    @for (item of archived(); track item.id) {
    <li forDraggable [dragData]="item">{{ item.label }}</li>
    }
  </ul>
</div>
```

```ts
onDrop(event: ForDragDropEvent<MyItem>): void {
  if (event.previousContainer === event.container) {
    this.updateList(event.container, (arr) =>
      moveItemInArray(arr, event.previousIndex, event.currentIndex),
    );
  } else {
    const result = transferArrayItem(
      event.previousContainer === this.activeCtx ? this.active() : this.archived(),
      event.container === this.activeCtx ? this.active() : this.archived(),
      event.previousIndex,
      event.currentIndex,
    );
    this.active.set(result.from);
    this.archived.set(result.to);
  }
}
```

## Two-list transfer with explicit `[connectedTo]`

```html
<ul forDropList #listA="forDropList" [connectedTo]="[listB]" (dragDrop)="onDrop($event)">
  ...
</ul>
<ul forDropList #listB="forDropList" [connectedTo]="[listA]" (dragDrop)="onDrop($event)">
  ...
</ul>
```

## Announcement customisation

Override the default ARIA live-region messages at any injector scope:

```ts
providers: [
  provideForDragDropDefaults({
    announceLift: (label, index, total) => `Grabbed ${label}, position ${index} of ${total}.`,
  }),
];
```
