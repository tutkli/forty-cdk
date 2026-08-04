# Table: virtualized rows

How `[forTableVirtualized]` windows a `forty-cdk/table` grid over `forty-cdk/virtualization`,
including the scroll-container choice and the ARIA reindexing contract. Split out of the table
README in [#1401](https://github.com/tutkli/forty-cdk/issues/1401) because it spans two entry
points; the adapter itself ships from the third,
[`forty-cdk/table-virtualization`](../projects/forty-cdk/table-virtualization/README.md), and the
table is documented in [the table README](../projects/forty-cdk/table/README.md).

`[forTableVirtualized]` is opt-in and works only with `<div role>` grid mode. Native `<table>` cannot omit rows mid-body (the browser recalculates all column widths when any row is missing), so virtualization requires the `<div>` structure documented in
[the table README](../projects/forty-cdk/table/README.md#div-mode).

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
import { ForTableVirtualized } from 'forty-cdk/table-virtualization';

afterEveryRender(() => {
  for (const el of this.rowEls()) {
    this.v.measureRow(el.nativeElement);
  }
});
```

## Scroll container (table root vs. ancestor)

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

### Wrapping: re-exposing / renaming `scrollElement`

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

## `[forTableVirtualized]` inputs

| Input             | Type                  | Default | Description                                                                                                         |
| ----------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `estimateRowSize` | `number`              | `44`    | Estimated row height in px. Used as the fixed size in fixed-size mode and as the initial estimate in measured mode. |
| `scrollElement`   | `HTMLElement \| null` | `null`  | Explicit scroll container. Defaults to the table root element; bind to an ancestor when it owns the scroll.         |

## `[forTableVirtualized]` API (`#v="forTableVirtualized"`)

| Member                         | Type                                | Description                                                                                                                                                                           |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `virtualRows()`                | `Signal<readonly VirtualItem[]>`    | The visible window plus overscan, always including the focused row.                                                                                                                   |
| `range()`                      | `Signal<readonly [number, number]>` | The rendered window as `[firstIndex, lastIndex + 1)`, sourced from the true virtualizer window (not the focus-augmented `virtualRows()`). Plugs straight into `injectInfiniteScroll`. |
| `totalSize()`                  | `Signal<number>`                    | Total scroll height of all rows in px. Bind to the body container height.                                                                                                             |
| `scrollToRow(index, options?)` | method                              | Scroll the container so row `index` is in view.                                                                                                                                       |
| `measureRow(el)`               | method                              | Record a rendered row element's measured size (for dynamic row heights).                                                                                                              |

## Tree-shaking

`@tanstack/virtual-core` only loads when you import `ForTableVirtualized`. A plain `ForTable` never pulls in the virtualization core.
