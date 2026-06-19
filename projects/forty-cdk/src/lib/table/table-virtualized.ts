import {
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

import { injectVirtualizer, type VirtualItem } from '../virtualization/virtualizer';
import { injectTableContext } from './table-context';
import { TableVirtualizedNavigator } from './table-virtualized-navigator';

/**
 * Opt-in row-virtualization companion for `[forTable]` in `<div role>` grid mode. Place it on the
 * same element as `[forTable]`; it builds the windowing core from the table's `[rowCount]` and
 * exposes the visible window for the consumer to render with their own `@for` + position transform.
 *
 * Tree-shakeable: `ForTable` never imports the virtualization core — only consumers that import
 * `ForTableVirtualized` bundle `@tanstack/virtual-core`.
 *
 * The focused row is kept mounted even when scrolled out of the window so the roving-focused
 * `gridcell` is never unmounted. SSR-safe: off-browser the window is empty and
 * `totalSize` is the estimate-based total.
 *
 * Also drives cross-window keyboard navigation: when an Arrow / Page / Ctrl+Home / Ctrl+End grid
 * action resolves a row outside the rendered window, it scrolls that row into view and moves roving
 * focus onto the target cell once it mounts (preserving the current column). `ForTable` stays
 * unaware of virtualization — it delegates the row-crossing move through the table context.
 */
@Directive({
  selector: '[forTableVirtualized]',
  exportAs: 'forTableVirtualized',
})
export class ForTableVirtualized {
  readonly #ctx = injectTableContext('ForTableVirtualized');
  readonly #rootEl = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Estimated row size in px along the scroll axis (the fixed-size fast path). Read for the size estimate. */
  readonly estimateRowSize = input(44, { transform: numberAttribute });

  /** Scroll container. Defaults to the table root element (the scroll container in `<div>` grid mode). */
  readonly scrollElement = input<HTMLElement | null>(null);

  readonly #scrollElement = computed(() => this.scrollElement() ?? this.#rootEl);

  readonly #virtualizer = injectVirtualizer({
    count: computed(() => this.#ctx.rowCount() ?? 0),
    estimateSize: () => this.estimateRowSize(),
    scrollElement: this.#scrollElement,
  });

  readonly #navigator = new TableVirtualizedNavigator({
    rows: this.#ctx.rows,
    scrollToRow: (index) => this.scrollToRow(index),
  });

  constructor() {
    this.#ctx.registerVirtualNavigation(this.#navigator);
    inject(DestroyRef).onDestroy(() => this.#ctx.registerVirtualNavigation(null));
    effect(() => {
      this.#ctx.rows();
      this.#navigator.tryResolvePending();
    });
  }

  /**
   * The rows in the visible window plus overscan, augmented to always include the focused row and
   * the row being reordered even when they are scrolled out of view (so the roving-focused cell
   * stays mounted, and a pointer reorder drag never unmounts the lifted row). Render these with
   * `@for (vrow of v.virtualRows(); track vrow.index)` and position each row absolutely with
   * `transform: translateY(vrow.start + 'px')`. Bind each row's `[virtualIndex]="vrow.index"`.
   */
  readonly virtualRows = computed<readonly VirtualItem[]>(() => {
    const items = this.#virtualizer.virtualItems();
    const retain = new Set<number>();
    const focused = this.#ctx.focusedRowIndex();
    if (focused !== null) {
      retain.add(focused);
    }
    const reordering = this.#ctx.reorderingRowIndex();
    if (reordering !== null) {
      retain.add(reordering);
    }
    for (const it of items) {
      retain.delete(it.index);
    }
    if (retain.size === 0) {
      return items;
    }
    const size = this.estimateRowSize();
    const retained: VirtualItem[] = [...retain].map((index) => ({
      index,
      key: index,
      start: index * size,
      size,
    }));
    return [...items, ...retained].sort((a, b) => a.index - b.index);
  });

  /** Total scroll size of all rows in px. Bind to the body container's height to size the scroll range. */
  readonly totalSize = this.#virtualizer.totalSize;

  /**
   * Scroll the container so the row at `index` is in view. Cross-window keyboard
   * navigation calls this internally; consumers may also call it to scroll
   * programmatically.
   */
  scrollToRow(index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }): void {
    this.#virtualizer.scrollToIndex(index, options);
  }

  /** Record the measured size of a rendered row element (dynamic / measured row heights). */
  measureRow(element: HTMLElement): void {
    this.#virtualizer.measureElement(element);
  }
}
