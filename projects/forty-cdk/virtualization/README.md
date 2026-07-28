# injectVirtualizer

A headless windowing core (injectVirtualizer) plus an ergonomic [forVirtualViewport] + \*forVirtualFor layer that render only the visible slice of huge lists. Fixed or measured item sizes, horizontal lists, scroll-to-index, and an infinite-scroll detector. List primitives (Select, Combobox, Listbox, Tree, Table) compose it directly.

Given a reactive item count, a size estimator, and a scroll container, the core returns the slice of items currently visible (plus overscan), the total scroll size, and imperative scroll/measure helpers. The consumer renders the items with their own `@for` and applies the position transform — this primitive owns no DOM. Backed internally by `@tanstack/virtual-core`. SSR-safe: off-browser it returns an empty window and the estimate-based total without touching `document`/`window`.

> Ships from the **`forty-cdk/virtualization`** secondary entry point — import every
> symbol below (`injectVirtualizer`, `ForVirtualViewport`, `ForVirtualFor`,
> `injectInfiniteScroll`, `ForTableVirtualized`) from `forty-cdk/virtualization`, not
> `forty-cdk`. This keeps `@tanstack/virtual-core` out of the main `forty-cdk` bundle for
> apps and routes that don't virtualize.

## Ergonomic layer

For the common "just virtualize this list" case, the optional Shape A layer wraps the manual
wiring: `[forVirtualViewport]` owns the scroll container, the total-size sizer, and the windowing
core, and `*forVirtualFor` renders the visible window with the position transform and
`aria-setsize` / `aria-posinset` applied for you.

```html
<div forVirtualViewport [virtualCount]="rows().length" [estimateSize]="44" style="height: 400px">
  <div *forVirtualFor="let row of rows(); let item = virtualItem">{{ row.label }}</div>
</div>
```

```ts
readonly rows = signal(Array.from({ length: 10000 }, (_, i) => ({ label: `Row ${i}` })));
```

The viewport forces `overflow: auto` on its host; give it a fixed size (e.g. `height: 400px`).
`orientation`, `overscan`, and `getItemKey` are optional inputs on `[forVirtualViewport]`; set
`orientation` / `overscan` before first render (they are read once when the viewport initializes).
The template context exposes `row` (`$implicit`), `virtualItem`, `index`, and `count`. Do not set
`position` / `transform` on the row yourself — the directive owns them.

For full control (custom DOM, dynamic per-item measurement, a window/document scroller) use the
headless `injectVirtualizer` core directly, documented below.

## Vertical list

```html
<div #scroll style="overflow: auto; height: 400px">
  <div [style.height.px]="v.totalSize()" style="position: relative">
    @for (item of v.virtualItems(); track item.key) {
    <div
      [attr.data-index]="item.index"
      [attr.aria-setsize]="items().length"
      [attr.aria-posinset]="item.index + 1"
      [style.position]="'absolute'"
      [style.top.px]="item.start"
      [style.height.px]="item.size"
      [style.width]="'100%'"
    >
      {{ items()[item.index] }}
    </div>
    }
  </div>
</div>
```

```ts
readonly items = signal(Array.from({ length: 10000 }, (_, i) => `Row ${i}`));
readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

readonly v = injectVirtualizer({
  count: computed(() => this.items().length),
  estimateSize: () => 40,
  scrollElement: this.scrollElement,
});
```

The spacer `div` (the one bound to `totalSize()`) is `position: relative` so the
absolutely positioned item slices stay inside the scroll container. Each item is
positioned with `top: item.start` instead of `translateY` so jsdom-based tests can
read the value without CSS layout; prefer `transform: translateY(item.start + 'px')
translateZ(0)` in production for GPU compositing.

## Dynamic item heights

When items have variable heights, query the rendered elements and feed each one to
`measureElement` so the virtualizer refines its estimates. The item element **must**
carry `[attr.data-index]="item.index"` so the virtualizer can look up which row the
element belongs to:

```html
@for (item of v.virtualItems(); track item.key) {
<div
  #row
  [attr.data-index]="item.index"
  [attr.aria-setsize]="items().length"
  [attr.aria-posinset]="item.index + 1"
  [style.position]="'absolute'"
  [style.top.px]="item.start"
  [style.width]="'100%'"
>
  {{ items()[item.index] }}
</div>
}
```

```ts
readonly rows = viewChildren<ElementRef<HTMLElement>>('row');

constructor() {
  afterEveryRender(() => {
    for (const row of this.rows()) {
      this.v.measureElement(row.nativeElement);
    }
  });
}
```

## Horizontal list

Set `orientation: 'horizontal'` and apply `translateX` instead of `translateY`.
The `totalSize()` drives the spacer's `width` rather than `height`:

```html
<div #scroll style="overflow: auto; display: flex; width: 600px">
  <div [style.width.px]="v.totalSize()" style="position: relative; height: 100%">
    @for (item of v.virtualItems(); track item.key) {
    <div
      [attr.data-index]="item.index"
      [style.position]="'absolute'"
      [style.left.px]="item.start"
      [style.width.px]="item.size"
      [style.height]="'100%'"
    >
      {{ items()[item.index] }}
    </div>
    }
  </div>
</div>
```

```ts
readonly v = injectVirtualizer({
  count: computed(() => this.items().length),
  estimateSize: () => 80,
  scrollElement: this.scrollElement,
  orientation: 'horizontal',
});
```

## Jumping to an item

```ts
this.v.scrollToIndex(500, { align: 'start' });
```

`align` accepts `'start'` | `'center'` | `'end'` | `'auto'` (default). `'auto'`
scrolls the minimum amount needed to bring the item into view.

## Drag-reorder

Apply `[forVirtualReorder]` on the same element as `[forVirtualViewport]` to make a
windowed `*forVirtualFor` list reorderable by pointer and keyboard. It composes
`[forDropList]` (drag-drop) and translates its window-relative drop into
dataset-**absolute** indices — so `moveItemInArray` over the full array moves the
right item even when the lifted row scrolls out of the rendered window. Mark each
rendered row as `[forDraggable]` with a `[dragData]`.

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

It never reorders the data itself (BYO-data): apply the move in the
`(itemReorder)` handler. Pointer drag works within the window and reaches rows
beyond it via auto-scroll (the lifted row is pinned mounted); keyboard reorder
(`Space`/`Enter` to lift, arrows / `Home` / `End` / `PageUp` / `PageDown` to step,
`Space`/`Enter` to drop, `Escape` to cancel) steps the target across the entire
dataset, scrolling unmounted target rows into view. Vertical lists only.

## Accessibility

Virtual lists render only a window of items, so screen readers see a shorter list
than the true total. Bind the full list size so assistive technology announces
the real count:

- `aria-setsize` — the total number of items in the full (non-windowed) list.
- `aria-posinset` — the 1-based position of the item in that full list
  (`item.index + 1`).

```html
<div [attr.aria-setsize]="items().length" [attr.aria-posinset]="item.index + 1"></div>
```

## API

### Options

| Property        | Type                                  | Description                                                                                  |
| --------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `count`         | `Signal<number>`                      | Reactive total number of items.<br>**Default:** required                                     |
| `estimateSize`  | `(index: number) => number`           | Estimated pixel size along the scroll axis for the item at `index`.<br>**Default:** required |
| `scrollElement` | `Signal<HTMLElement \| null>`         | Reactive scroll container.<br>**Default:** required                                          |
| `orientation`   | `'vertical' \| 'horizontal'`          | Scroll axis.<br>**Default:** `'vertical'`                                                    |
| `overscan`      | `number`                              | Extra items to render beyond the visible window on each side.<br>**Default:** `5`            |
| `getItemKey`    | `(index: number) => string \| number` | Stable key per item; used by `@for (track item.key)`.<br>**Default:** `(i) => i`             |

### Returned handle

| Member           | Type                                | Description                                                                                                        |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `virtualItems`   | `Signal<readonly VirtualItem[]>`    | Items in the current visible window plus overscan.                                                                 |
| `totalSize`      | `Signal<number>`                    | Total scroll size in pixels (drives the spacer element).                                                           |
| `range`          | `Signal<readonly [number, number]>` | The `[firstIndex, lastIndex + 1)` rendered window, `[0, 0]` when empty. Feeds a list primitive's `[visibleRange]`. |
| `scrollToIndex`  | method                              | Scroll the container so the item at `index` is in view.                                                            |
| `scrollToOffset` | method                              | Scroll to an absolute pixel offset.                                                                                |
| `measureElement` | method                              | Record the measured size of a rendered item element.                                                               |

## Infinite scroll

Two shapes are available: a turnkey output on `[forVirtualViewport]` (Shape A) and a
composable `injectInfiniteScroll` core for manual wiring (Shape B).

### Shape A — `(endReached)` output

Wire directly onto `[forVirtualViewport]`; the viewport builds the detector internally:

```html
<div
  forVirtualViewport
  [virtualCount]="rows().length"
  [estimateSize]="44"
  (endReached)="loadMore()"
  style="height: 400px"
>
  <div *forVirtualFor="let row of rows(); let item = virtualItem">{{ row.label }}</div>
</div>
```

### Shape B — `injectInfiniteScroll`

Compose with the headless core when you need `pending` state or custom `threshold`/`disabled`.
The consumer owns the fetch and the data accumulation; the library decides _when_ to ask:

```ts
readonly v = injectVirtualizer({ count: this.count, estimateSize: () => 40, scrollElement: this.scrollEl });

readonly loader = injectInfiniteScroll({
  range: this.v.range,
  count: this.count,
  disabled: computed(() => !this.hasMore()),
  onLoadMore: () => this.fetchNextPage(),
});
```

The detector fires once per threshold crossing, is suppressed while the `onLoadMore` promise is
pending (`loader.pending()` reflects the in-flight state), and re-arms when `count` grows (a page
was appended). An empty `[0, 0]` window (including SSR off-browser) never fires. The consumer owns
the fetch, deduplication, and retry — Angular `resource()` / `httpResource()` are a natural fit.

| Option       | Type                                | Default  | Description                                                             |
| ------------ | ----------------------------------- | -------- | ----------------------------------------------------------------------- |
| `range`      | `Signal<readonly [number, number]>` | required | The rendered window from `injectVirtualizer(...).range`.                |
| `count`      | `Signal<number>`                    | required | Reactive total number of currently-loaded items.                        |
| `threshold`  | `number`                            | `5`      | Fire when the window's last index is within this many items of `count`. |
| `disabled`   | `Signal<boolean>`                   | —        | When `true` the detector never fires.                                   |
| `onLoadMore` | `() => void \| Promise<unknown>`    | required | Called once per threshold crossing; returning a promise arms `pending`. |

## Composing into a list primitive

`range` lets the windowing core plug directly into a list primitive's `[visibleRange]` input without the consumer re-deriving the window from `virtualItems()`. The primitive uses `[visibleRange]` to keep `aria-setsize` / `aria-posinset` and `aria-activedescendant` correct across row recycling — it tracks option data by absolute index so options scrolled out of view are still reachable by keyboard.

```html
[totalCount]="filtered().length" [visibleRange]="v.range()"
(scrollToIndex)="v.scrollToIndex($event)"
```

See the [Combobox README](../combobox/README.md#virtualization) for the complete worked example wiring `[forCombobox]` with `injectVirtualizer` over a 100k-item list.

## Wrapping in a design system

Subclassing the root is the supported pattern; the subclass must re-provide `FOR_VIRTUAL_VIEWPORT_CONTEXT` because Angular does not inherit a directive's `providers`, and every projected piece resolves its context through it. See [Wrapping non-form roots](../../../docs/wrapping-non-form-roots.md).
