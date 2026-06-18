import { computed, Directive, ElementRef, inject, input, numberAttribute } from '@angular/core';

import { injectVirtualizer, type VirtualItem } from '../virtualization/virtualizer';
import { injectTableContext } from './table-context';

/**
 * Opt-in row-virtualization companion for `[forTable]` in `<div role>` grid mode. Place it on the
 * same element as `[forTable]`; it builds the windowing core from the table's `[rowCount]` and
 * exposes the visible window for the consumer to render with their own `@for` + position transform.
 *
 * Tree-shakeable: `ForTable` never imports the virtualization core — only consumers that import
 * `ForTableVirtualized` bundle `@tanstack/virtual-core`.
 *
 * The focused row is kept mounted even when scrolled out of the window so the roving-focused
 * `gridcell` is never unmounted (React Aria pattern). SSR-safe: off-browser the window is empty and
 * `totalSize` is the estimate-based total.
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

  /**
   * The rows in the visible window plus overscan, augmented to always include the focused row even
   * when it is scrolled out of view (so its roving-focused cell stays mounted). Render these with
   * `@for (vrow of v.virtualRows(); track vrow.index)` and position each row absolutely with
   * `transform: translateY(vrow.start + 'px')`. Bind each row's `[virtualIndex]="vrow.index"`.
   */
  readonly virtualRows = computed<readonly VirtualItem[]>(() => {
    const items = this.#virtualizer.virtualItems();
    const focused = this.#ctx.focusedRowIndex();
    if (focused === null || items.some((it) => it.index === focused)) {
      return items;
    }
    const size = this.estimateRowSize();
    const retained: VirtualItem = {
      index: focused,
      key: focused,
      start: focused * size,
      size,
    };
    return [...items, retained].sort((a, b) => a.index - b.index);
  });

  /** Total scroll size of all rows in px. Bind to the body container's height to size the scroll range. */
  readonly totalSize = this.#virtualizer.totalSize;

  /** Scroll the container so the row at `index` is in view. Forward a keyboard nav target here. */
  scrollToRow(index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }): void {
    this.#virtualizer.scrollToIndex(index, options);
  }

  /** Record the measured size of a rendered row element (dynamic / measured row heights). */
  measureRow(element: HTMLElement): void {
    this.#virtualizer.measureElement(element);
  }
}
