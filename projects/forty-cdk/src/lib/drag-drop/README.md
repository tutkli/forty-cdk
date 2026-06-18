# Drag & Drop

Headless accessible drag-and-drop for sortable lists and cross-list item
transfers. Supports both keyboard and pointer (mouse / touch / pen) dragging.

## Keyboard model

| State  | Key         | Action                                     |
| ------ | ----------- | ------------------------------------------ |
| Idle   | Arrow keys  | Move roving focus between items            |
| Idle   | Home / End  | Jump to first / last item                  |
| Idle   | Space/Enter | **Lift** the focused item                  |
| Lifted | Arrow keys  | Step the logical drop position             |
| Lifted | Space/Enter | **Drop** (commits and emits `(dragDrop)`)  |
| Lifted | Escape      | **Cancel** (no event, focus stays on item) |

Arrow direction follows the list's `orientation` and respects RTL via `dir`.

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

## Data attributes

| Attribute               | Element           | Meaning                                                                              |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| `data-orientation`      | `[forDropList]`   | `"vertical"` or `"horizontal"`                                                       |
| `data-disabled`         | both              | Present when the item or list is disabled                                            |
| `data-dragging`         | `[forDropList]`   | Present while a drag originates here                                                 |
| `data-dragging`         | `[forDraggable]`  | Present while this item is lifted                                                    |
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
