# Drag & Drop

Headless keyboard-accessible drag-and-drop for sortable lists and cross-list
item transfers. **Phase 1 is keyboard-only — pointer dragging lands in a
follow-up.**

## Keyboard model

| State  | Key         | Action                                        |
| ------ | ----------- | --------------------------------------------- |
| Idle   | Arrow keys  | Move roving focus between items               |
| Idle   | Home / End  | Jump to first / last item                     |
| Idle   | Space/Enter | **Lift** the focused item                     |
| Lifted | Arrow keys  | Step the logical drop position                |
| Lifted | Space/Enter | **Drop** (commits and emits `(dragDrop)`)     |
| Lifted | Escape      | **Cancel** (no event, focus stays on item)    |

Arrow direction follows the list's `orientation` and respects RTL via `dir`.

## Data attributes

| Attribute            | Element         | Meaning                                    |
| -------------------- | --------------- | ------------------------------------------ |
| `data-orientation`   | `[forDropList]` | `"vertical"` or `"horizontal"`             |
| `data-disabled`      | both            | Present when the item or list is disabled  |
| `data-dragging`      | `[forDropList]` | Present while a drag originates here       |
| `data-dragging`      | `[forDraggable]`| Present while this item is lifted          |
| `data-drag-over`     | `[forDropList]` | Present while this list is the drop target |

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
]
```
