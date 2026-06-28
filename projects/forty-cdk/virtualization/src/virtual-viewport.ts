import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  type OnInit,
  type Signal,
  computed,
  inject,
  input,
  output,
  runInInjectionContext,
  signal,
} from '@angular/core';

import {
  FOR_VIRTUAL_VIEWPORT_CONTEXT,
  type ForVirtualViewportContext,
} from './virtual-viewport-context';
import { injectInfiniteScroll } from './infinite-scroll';
import {
  type ForVirtualizer,
  type VirtualItem,
  estimateTotal,
  injectVirtualizer,
} from './virtualizer';

/** Default estimated item size, in CSS pixels, when none is provided. */
const DEFAULT_ESTIMATE_SIZE = 50;

/** Default number of items rendered beyond the visible window on each side. */
const DEFAULT_OVERSCAN = 5;

/**
 * Scroll viewport for the ergonomic virtualization layer. Decorate a fixed-size
 * scroll container with `[forVirtualViewport]`, give it `[virtualCount]` and an
 * `[estimateSize]`, and nest a single `*forVirtualFor` inside it — the viewport
 * owns the scroll container, the total-size sizer, and the windowing core, so
 * the consumer writes no manual spacer or position transform.
 *
 * Built on the headless {@link injectVirtualizer} core; for full manual control
 * (custom DOM, dynamic measurement, window/document scroller) use that directly.
 *
 * The viewport forces `overflow: auto` on its host and renders a relatively
 * positioned sizer whose main-axis size tracks `totalSize()`; `*forVirtualFor`
 * projects its rows into that sizer and positions each one absolutely.
 *
 * `orientation` and `overscan` are read once when the viewport initializes;
 * change them before first render, not at runtime.
 */
@Component({
  selector: 'for-virtual-viewport, [forVirtualViewport]',
  exportAs: 'forVirtualViewport',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_VIRTUAL_VIEWPORT_CONTEXT, useExisting: ForVirtualViewport }],
  host: {
    '[style.overflow]': '"auto"',
  },
  template: `
    <div style="position: relative" [style.width]="sizerWidth()" [style.height]="sizerHeight()">
      <ng-content />
    </div>
  `,
})
export class ForVirtualViewport implements ForVirtualViewportContext, OnInit {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);
  readonly #scrollElement = signal<HTMLElement | null>(this.#host.nativeElement);
  readonly #virtualizer = signal<ForVirtualizer | null>(null);

  /** Total number of items in the full list. */
  readonly virtualCount = input.required<number>();

  /** Estimated item size in px along the scroll axis: a number or a per-index estimator. */
  readonly estimateSize = input<number | ((index: number) => number)>(DEFAULT_ESTIMATE_SIZE);

  /** Scroll axis. Resolved once on init; runtime changes are not tracked by the core. */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /** Items rendered beyond the visible window on each side. Resolved once on init. */
  readonly overscan = input<number>(DEFAULT_OVERSCAN);

  /** Stable key for the item at `index`. Defaults to the index. */
  readonly getItemKey = input<((index: number) => string | number) | undefined>(undefined);

  /**
   * Emits when the rendered window comes within ~`overscan` items of the end of
   * the list, signalling the consumer to load the next page. Built on
   * {@link injectInfiniteScroll}; fires once per threshold crossing and re-arms
   * when the bound count grows. The consumer owns the fetch (e.g. via `resource()`).
   */
  readonly endReached = output<void>();

  /**
   * The total number of items in the full (non-windowed) list — the
   * {@link ForVirtualViewportContext.count} the nested `*forVirtualFor` reads.
   * Aliases the `virtualCount` input signal directly (no wrapper node).
   */
  readonly count = this.virtualCount;

  readonly #estimator = computed<(index: number) => number>(() => {
    const estimate = this.estimateSize();
    return typeof estimate === 'function' ? estimate : () => estimate;
  });

  readonly #estimateTotal = computed(() => estimateTotal(this.count(), this.#estimator()));

  readonly #reorderingIndex = signal<number | null>(null);

  /**
   * The items in the currently visible window plus overscan, augmented to always
   * include the row pinned via {@link setReorderingIndex} even when it is scrolled
   * out of view, so a drag-reorder's lifted row is never recycled out from under
   * the gesture. Pinning never widens {@link range} (sourced from the underlying
   * virtualizer), so it leaves infinite-scroll untouched.
   */
  readonly virtualItems: Signal<readonly VirtualItem[]> = computed(() => {
    const items = this.#virtualizer()?.virtualItems() ?? [];
    const retain = this.#reorderingIndex();
    if (retain === null || retain < 0 || retain >= this.count()) {
      return items;
    }
    if (items.some((item) => item.index === retain)) {
      return items;
    }
    return [...items, this.#retainedItem(retain)].sort((a, b) => a.index - b.index);
  });

  /** Total scroll size of all items, in pixels (drives the sizer). */
  readonly totalSize = computed(() => this.#virtualizer()?.totalSize() ?? this.#estimateTotal());

  readonly #range = computed<readonly [number, number]>(
    () => this.#virtualizer()?.range() ?? [0, 0],
  );

  protected readonly sizerWidth = computed(() =>
    this.orientation() === 'horizontal' ? `${this.totalSize()}px` : '100%',
  );

  protected readonly sizerHeight = computed(() =>
    this.orientation() === 'horizontal' ? '100%' : `${this.totalSize()}px`,
  );

  ngOnInit(): void {
    runInInjectionContext(this.#injector, () => {
      this.#virtualizer.set(
        injectVirtualizer({
          count: this.count,
          estimateSize: (index) => this.#estimator()(index),
          scrollElement: this.#scrollElement,
          orientation: this.orientation(),
          overscan: this.overscan(),
          getItemKey: this.getItemKey(),
        }),
      );
      injectInfiniteScroll({
        range: this.#range,
        count: this.count,
        onLoadMore: () => this.endReached.emit(),
      });
    });
  }

  /**
   * Pin the row at the absolute `index` into the rendered window so it stays
   * mounted even when the window scrolls past it — used by `[forVirtualReorder]`
   * to keep a drag-reorder's lifted row alive across auto-scroll and dataset-wide
   * keyboard stepping. Pass `null` to release. No-op when the index is out of
   * range; rarely needed directly.
   */
  setReorderingIndex(index: number | null): void {
    this.#reorderingIndex.set(index);
  }

  /** Scroll the container so the item at `index` is in view. No-op until initialized. */
  scrollToIndex(index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }): void {
    this.#virtualizer()?.scrollToIndex(index, options);
  }

  /** Scroll the container to an absolute pixel offset. No-op until initialized. */
  scrollToOffset(offset: number): void {
    this.#virtualizer()?.scrollToOffset(offset);
  }

  /** Record the measured size of a rendered item element. No-op until initialized. */
  measureElement(element: HTMLElement): void {
    this.#virtualizer()?.measureElement(element);
  }

  #retainedItem(index: number): VirtualItem {
    const estimator = this.#estimator();
    let start = 0;
    for (let i = 0; i < index; i++) {
      start += estimator(i);
    }
    const key = this.getItemKey()?.(index) ?? index;
    return { index, key, start, size: estimator(index) };
  }
}
