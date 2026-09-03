---
title: Table Virtualization
group: none
archetype: [composable-ui]
foldInto: table#virtualized-rows
---

# ForTableVirtualized

The opt-in row-virtualization companion for `[forTable]`: it builds a windowing core from the table's `[rowCount]` and exposes the visible slice for the consumer to render, plus cross-window roving keyboard navigation.

`[forTableVirtualized]` sits on the same element as `[forTable]` and works only with `<div role>` grid mode — a native `<table>` cannot omit rows mid-body without the browser recalculating every column width. It owns no DOM of its own: the consumer renders `virtualRows()` with their own `@for` and positions each row with a `translateY` transform, or lets `<for-table-body>` own the sizer. The focused row stays mounted even when scrolled out of the window, so the roving-focused `gridcell` is never unmounted. SSR-safe: off-browser the window is empty and `totalSize` is the estimate-based total.

> Ships from the **`forty-cdk/table-virtualization`** secondary entry point, not from
> `forty-cdk/virtualization`. It is the one adapter that composes both `forty-cdk/table` and
> `forty-cdk/virtualization`, so keeping it here is what lets a consumer who windows a plain
> list import `forty-cdk/virtualization` without pulling the table into their module graph.

## Anatomy

```html
<div
  forTable
  mode="grid"
  ariaLabel="People"
  [rowCount]="rows().length"
  forTableVirtualized
  [estimateRowSize]="44"
  #v="forTableVirtualized"
  style="height: 400px; overflow: auto"
>
  <div role="rowgroup" style="position: relative" [style.height.px]="v.totalSize()">
    @for (vrow of v.virtualRows(); track vrow.index) {
    <div
      forTableRow
      [virtualIndex]="vrow.index"
      [value]="rows()[vrow.index]"
      style="position: absolute; inset-inline: 0"
      [style.transform]="'translateY(' + vrow.start + 'px)'"
    >
      <div forTableCell name="name">{{ rows()[vrow.index].name }}</div>
      <div forTableCell name="email">{{ rows()[vrow.index].email }}</div>
    </div>
    }
  </div>
</div>
```

Bind `[rowCount]` on `[forTable]` to the **true total** so `aria-rowcount` and the window size both stay honest, and give each rendered row its `[virtualIndex]` so `aria-rowindex` reports the absolute position rather than the position within the window.

## Two totals: `[rowCount]` and `[virtualRowCount]`

`[rowCount]` is the **server-known** total `aria-rowcount` reports; `[virtualRowCount]` is the count of rows the virtualizer can actually place. They default to the same number, and for an **index-addressable** dataset — page N is fetchable the moment the window reaches it — they should stay that way: `[rowCount]` alone is the whole configuration.

They diverge for an **append-style infinite list**, the load-30-concatenate-load-30-more shape. There the placeable range is the loaded prefix, so leave `[rowCount]` at the server total and bind `[virtualRowCount]` to the loaded count:

```html
<div
  forTable
  forTableVirtualized
  mode="grid"
  [rowCount]="serverTotal()"
  [virtualRowCount]="loaded().length"
></div>
```

Without it the scroll range stretches over thousands of rows the virtualizer will never place — the thumb shrinks to a sliver and the viewport scrolls into empty space — and the only workaround is to report the loaded count as `aria-rowcount`, which is wrong on every page but the last. `[virtualRowCount]` also bounds cross-window keyboard navigation, so `Ctrl+End` lands on the last loaded row instead of stashing a focus move that resolves only when a far page appends.

A declarative `<for-table-body>` derives the loaded count from its own dataset for the navigation bound, but the scroll range still comes from these two inputs — so both shapes reach the channel the same way, and raw-primitive rendering (no `<for-table-body>`) has no other way to reach it at all.

## Measured row heights

Pass each rendered row element to `measureRow` when heights vary, and the core replaces the estimate with the measured size:

```html
<div forTableRow [virtualIndex]="vrow.index" #row (attached)="v.measureRow(row)">…</div>
```

Passing `null` sweeps a row recycled out of the window from the measurement cache.

## Keyboard navigation across the window

Arrow / `Page` / `Ctrl+Home` / `Ctrl+End` grid actions that resolve a row outside the rendered window scroll that row into view and move roving focus onto the target cell once it mounts, preserving the current column. `[forTable]` stays unaware of virtualization — it delegates the row-crossing move through the table context, so nothing in `forty-cdk/table` imports this entry point.

## Infinite scroll

`range` is the true rendered window as an inclusive-exclusive `[firstIndex, lastIndex + 1)` range, sourced from the underlying virtualizer rather than from `virtualRows()` (which is augmented with the focused and reordering rows). It plugs straight into `injectInfiniteScroll`:

```ts
readonly detector = injectInfiniteScroll({
  range: this.v().range,
  count: this.loaded,
  onLoadMore: () => this.loadNextPage(),
});
```

## Accessibility

Virtualization renders only a window of rows, so the table must keep announcing the real totals: bind `[rowCount]` on `[forTable]` (it drives `aria-rowcount`) and `[virtualIndex]` on each rendered row (it drives `aria-rowindex`). An append-style list keeps `[rowCount]` at the server total and narrows the scroll range with `[virtualRowCount]` instead of lowering the announced total. Focus management is handled for you — the focused row is retained in the window so roving focus is never lost to an unmounted cell.

## API

### `ForTableVirtualized`

| Property          | Type                                | Description                                                                                                                                                                                                                                                    |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `estimateRowSize` | `number`                            | Estimated row size in px along the scroll axis.<br>**Default:** `44`                                                                                                                                                                                           |
| `scrollElement`   | `HTMLElement \| null`               | Scroll container; bind it when the container is an **ancestor** of the table.<br>**Default:** `null` (the table root)                                                                                                                                          |
| `virtualRowCount` | `number \| undefined`               | Count of rows the virtualizer can place — the scroll range and the cross-window navigation bound. Bind it for an append-style infinite list, whose placeable range is the loaded prefix rather than the server total.<br>**Default:** the table's `[rowCount]` |
| `virtualRows`     | `Signal<readonly VirtualItem[]>`    | The visible window plus overscan, augmented with the focused and reordering rows.                                                                                                                                                                              |
| `totalSize`       | `Signal<number>`                    | Total scroll size of all rows in px. Bind to the body container's height.                                                                                                                                                                                      |
| `range`           | `Signal<readonly [number, number]>` | The true `[firstIndex, lastIndex + 1)` window, unaffected by retained rows.                                                                                                                                                                                    |
| `scrollToRow`     | method                              | Scroll the container so the row at `index` is in view.                                                                                                                                                                                                         |
| `measureRow`      | method                              | Record the measured size of a rendered row element; `null` sweeps an evicted row.                                                                                                                                                                              |

## Related

- **[Table: virtualized rows](../../../docs/table-virtualized-rows.md)** — the full guide, including `<for-table-body>` integration and total-aware selection.
- **[`forty-cdk/virtualization`](../virtualization/README.md)** — the windowing core this adapter builds on.
- **[`forty-cdk/table`](../table/README.md)** — the table primitive it composes.
