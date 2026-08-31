---
title: Virtual Reorder
group: none
archetype: [composable-ui]
foldInto: drag-drop#virtualized-lists
---

# ForVirtualReorder

Drag-reorder for a windowed `*forVirtualFor` list: it wraps `[forDropList]` and translates the window-relative drop into dataset-**absolute** indices, so a reorder is correct even when the lifted row scrolls out of the rendered window.

Apply `[forVirtualReorder]` on the same element as `[forVirtualViewport]` and mark each rendered row as `[forDraggable]` with a `[dragData]`. It is the drag-drop-side analogue of `[forTableRowReorder]` for non-table virtualized lists, and it **never reorders the data itself** (BYO-data): apply the move to your own array in the `(itemReorder)` handler. Vertical lists only.

> Ships from the **`forty-cdk/virtual-reorder`** secondary entry point, not from
> `forty-cdk/virtualization`. It composes both `forty-cdk/virtualization` and
> `forty-cdk/drag-drop`, so keeping it here is what lets a consumer who only windows a
> list import `forty-cdk/virtualization` without pulling drag-drop into their module graph.

## Anatomy

```html
<div
  forVirtualViewport
  [virtualCount]="rows().length"
  [estimateSize]="44"
  forVirtualReorder
  (itemReorder)="onReorder($event)"
  style="height: 400px"
>
  <div *forVirtualFor="let row of rows()" forDraggable [dragData]="row.id">{{ row.label }}</div>
</div>
```

```ts
onReorder({ from, to }: ForVirtualReorderEvent): void {
  this.rows.update((rows) => moveItemInArray(rows, from, to));
}
```

## What it adds over a bare `[forDropList]`

- **Absolute-index translation** — each rendered row's absolute index is read from the `data-index` attribute `*forVirtualFor` emits, so `itemReorder` carries dataset indices and `moveItemInArray` over the full array moves the right item.
- **Lifted-row pinning** — the lifted row is pinned into the window through the viewport's reordering index, so auto-scroll and a keyboard jump can both carry the window past it without recycling it. The pinned row keeps its DOM node, so it stays focused across the jump and the gesture survives to the drop.
- **Dataset-wide keyboard reorder** — keyboard stepping runs over the true total count, scrolling unmounted target rows into view rather than being confined to the window.

## Windowed scrub

Hold **Shift** during a pointer drag to map the viewport onto the whole dataset (top edge → first item, bottom edge → last), so a single gesture drops the lifted item at an arbitrary far item without waiting for auto-scroll to reach it. Without Shift, pointer resolution is unchanged.

## Keyboard interaction

| Key                     | Behaviour                                    |
| ----------------------- | -------------------------------------------- |
| `Space` / `Enter`       | Lift the focused row, or drop the lifted row |
| `ArrowUp` / `ArrowDown` | Step the target one position                 |
| `Home` / `End`          | Move the target to the first / last item     |
| `PageUp` / `PageDown`   | Step the target by one window                |
| `Escape`                | Cancel the gesture and restore the origin    |

Every lift, move, drop and cancel is announced through the live announcer using the `provideForDragDropDefaults` message builders, so a scope override localizes them centrally.

The lifted row carries drag-drop's `data-dragging` hook for the whole gesture — the coordinator owns the keyboard lift, so it marks the row on the drop list's behalf — and the viewport carries it too. Style either exactly as you would in a non-windowed `[forDropList]`.

## API

### `ForVirtualReorder`

| Member        | Type                             | Description                                                                 |
| ------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `itemReorder` | `output<ForVirtualReorderEvent>` | Fires once per committed gesture with `{ from, to }` absolute item indices. |

It re-exposes `[forDropList]`'s `dir`, `disabled`, `autoScroll`, `animateReorder`, `liveSort`, `boundary` and `lockAxis` inputs through `hostDirectives`.

### `ForVirtualReorderEvent`

| Property | Type     | Description                                                    |
| -------- | -------- | -------------------------------------------------------------- |
| `from`   | `number` | Previous absolute (dataset) index of the lifted item, 0-based. |
| `to`     | `number` | New absolute (dataset) index — pass both to `moveItemInArray`. |

## Related

- **[`forty-cdk/virtualization`](../virtualization/README.md)** — the viewport this adapter pins and scrolls.
- **[`forty-cdk/drag-drop`](../drag-drop/README.md)** — the drop list it wraps.
