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

## Data attributes

| Attribute               | Element           | Meaning                                                                             |
| ----------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `data-orientation`      | `[forDropList]`   | `"vertical"` or `"horizontal"`                                                      |
| `data-disabled`         | both              | Present when the item or list is disabled                                           |
| `data-dragging`         | `[forDropList]`   | Present while a drag originates here                                                |
| `data-dragging`         | `[forDraggable]`  | Present while this item is lifted                                                   |
| `data-drag-over`        | `[forDropList]`   | Present while this list is the drop target                                          |
| `data-drag-handle`      | `[forDragHandle]` | Present on every registered drag handle                                             |
| `data-for-drag-preview` | preview element   | Present on the default clone preview **or** the `[forDragPreview]` template wrapper |

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
