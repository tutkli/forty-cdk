# injectVirtualizer

Headless windowing core: given a reactive item count, a size estimator, and a
scroll container, returns the slice of items currently visible (plus overscan),
the total scroll size, and imperative scroll/measure helpers. The consumer renders
the items with their own `@for` and applies the position transform — this primitive
owns no DOM.

Backed internally by `@tanstack/virtual-core`. SSR-safe: off-browser it returns
an empty window and the estimate-based total without touching `document`/`window`.

## Ergonomic layer (`[forVirtualViewport]` + `*forVirtualFor`)

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

## Vertical list (fixed item heights)

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

## Dynamic item heights (with `measureElement`)

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

## Options

| Option          | Type                                  | Default      | Description                                                         |
| --------------- | ------------------------------------- | ------------ | ------------------------------------------------------------------- |
| `count`         | `Signal<number>`                      | required     | Reactive total number of items.                                     |
| `estimateSize`  | `(index: number) => number`           | required     | Estimated pixel size along the scroll axis for the item at `index`. |
| `scrollElement` | `Signal<HTMLElement \| null>`         | required     | Reactive scroll container.                                          |
| `orientation`   | `'vertical' \| 'horizontal'`          | `'vertical'` | Scroll axis.                                                        |
| `overscan`      | `number`                              | `5`          | Extra items to render beyond the visible window on each side.       |
| `getItemKey`    | `(index: number) => string \| number` | `(i) => i`   | Stable key per item; used by `@for (track item.key)`.               |

## Returned handle

| Member           | Type                             | Description                                              |
| ---------------- | -------------------------------- | -------------------------------------------------------- |
| `virtualItems`   | `Signal<readonly VirtualItem[]>` | Items in the current visible window plus overscan.       |
| `totalSize`      | `Signal<number>`                 | Total scroll size in pixels (drives the spacer element). |
| `scrollToIndex`  | method                           | Scroll the container so the item at `index` is in view.  |
| `scrollToOffset` | method                           | Scroll to an absolute pixel offset.                      |
| `measureElement` | method                           | Record the measured size of a rendered item element.     |
