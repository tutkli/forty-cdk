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

import { TABLE_REGISTRATION_CONTEXT, type TableRegistrationContext } from 'forty-cdk/core';
import { FOR_TABLE_CONTEXT, type ForTableContext } from 'forty-cdk/table';
import { injectVirtualizer, type VirtualItem } from 'forty-cdk/virtualization';

import { TableVirtualizedNavigator } from './table-virtualized-navigator';

const ORPHAN_ERROR =
  '[forty-cdk/table-virtualization] ForTableVirtualized must be used inside a [forTable] element.';

function injectTableContext(): ForTableContext {
  const ctx = inject(FOR_TABLE_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(ORPHAN_ERROR);
  }
  return ctx;
}

function injectTableRegistration(): TableRegistrationContext {
  const registration = inject(TABLE_REGISTRATION_CONTEXT, { optional: true });
  if (!registration) {
    throw new Error(ORPHAN_ERROR);
  }
  return registration;
}

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
  readonly #ctx = injectTableContext();
  readonly #registration = injectTableRegistration();
  readonly #rootEl = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Estimated row size in px along the scroll axis (the fixed-size fast path). Read for the size estimate. */
  readonly estimateRowSize = input(44, { transform: numberAttribute });

  /**
   * Scroll container. Defaults to the table root element (the scroll container in `<div>` grid
   * mode). Bind it explicitly when the scroll container is an **ancestor** of the table — e.g. an
   * app-shell viewport that scrolls projected content — since the table cannot inject an ancestor
   * it does not own. A design-system wrapper can re-expose or rename this input through
   * `hostDirectives` input aliasing (`inputs: ['scrollElement: scrollContainer']`) with no bridging
   * effect required.
   */
  readonly scrollElement = input<HTMLElement | null>(null);

  readonly #scrollElement = computed(() => this.scrollElement() ?? this.#rootEl);
  readonly #rowCount = computed(() => this.#ctx.rowCount() ?? 0);

  readonly #virtualizer = injectVirtualizer({
    count: this.#rowCount,
    estimateSize: () => this.estimateRowSize(),
    scrollElement: this.#scrollElement,
  });

  readonly #navigator = new TableVirtualizedNavigator({
    rows: this.#registration.rows,
    scrollToRow: (index) => this.scrollToRow(index),
    scrollViewportRect: () => this.#scrollElement().getBoundingClientRect(),
    rowCount: this.#rowCount,
    loadedRowCount: () => this.#ctx.loadedRowCount(),
  });

  constructor() {
    this.#registration.registerVirtualNavigation(this.#navigator);
    this.#registration.registerVirtualWindow({
      rows: this.virtualRows,
      totalSize: this.totalSize,
      measureRow: (element) => this.measureRow(element),
    });
    inject(DestroyRef).onDestroy(() => {
      this.#registration.registerVirtualNavigation(null);
      this.#registration.registerVirtualWindow(null);
    });
    effect(() => {
      this.#registration.rows();
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
    const reordering = this.#registration.reorderingRowIndex();
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
    const retained: VirtualItem[] = [...retain].map(
      (index) =>
        this.#virtualizer.measurementFor(index) ?? { index, key: index, start: index * size, size },
    );
    return [...items, ...retained].sort((a, b) => a.index - b.index);
  });

  /** Total scroll size of all rows in px. Bind to the body container's height to size the scroll range. */
  readonly totalSize = this.#virtualizer.totalSize;

  /**
   * The rendered window as the inclusive-exclusive `[firstIndex, lastIndex + 1)` index range,
   * sourced from the underlying virtualizer (the true window) — not from {@link virtualRows},
   * which is augmented with the focused / reordering rows. So a row retained out of the window
   * never widens this range. Plugs straight into `injectInfiniteScroll({ range, count, onLoadMore })`.
   */
  readonly range = this.#virtualizer.range;

  /**
   * Scroll the container so the row at `index` is in view. Cross-window keyboard
   * navigation calls this internally; consumers may also call it to scroll
   * programmatically.
   */
  scrollToRow(index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }): void {
    this.#virtualizer.scrollToIndex(index, options);
  }

  /**
   * Record the measured size of a rendered row element (dynamic / measured row heights).
   * Passing `null` sweeps evicted rows recycled out of the window from the measurement cache.
   */
  measureRow(element: HTMLElement | null): void {
    this.#virtualizer.measureElement(element);
  }
}
