import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  type Signal,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from '@tanstack/virtual-core';
import type {
  VirtualItem as CoreVirtualItem,
  VirtualizerOptions as CoreVirtualizerOptions,
} from '@tanstack/virtual-core';

import { afterNextRenderCancellable } from 'forty-cdk/core';

/** Default number of items rendered beyond the visible window on each side. */
const DEFAULT_OVERSCAN = 5;

/**
 * Configuration for {@link injectVirtualizer}. The consumer owns the data and
 * the DOM; the virtualizer only computes which slice of the data is visible.
 */
export interface VirtualizerOptions {
  /** Reactive total number of items in the list. */
  readonly count: Signal<number>;
  /**
   * Estimated size, in CSS pixels, of the item at `index` along the scroll
   * axis (height when vertical, width when horizontal). Used until an item is
   * measured. Should be a stable function reference.
   */
  readonly estimateSize: (index: number) => number;
  /** Reactive reference to the scroll container element (e.g. a `viewChild`). */
  readonly scrollElement: Signal<HTMLElement | null>;
  /** Scroll axis. Defaults to `'vertical'`. */
  readonly orientation?: 'vertical' | 'horizontal';
  /**
   * Number of items to render beyond the visible window on each side, to
   * reduce blank flashes while scrolling. Defaults to `5`.
   */
  readonly overscan?: number;
  /** Stable key for the item at `index`. Defaults to the index itself. */
  readonly getItemKey?: (index: number) => string | number;
  /**
   * Offset, in CSS pixels, added before the first item along the scroll axis.
   * Every item's computed offset and every `scrollToIndex` / `scrollToOffset`
   * alignment shifts by this amount, so a sticky header rendered inside the
   * scroller no longer overlaps the row a cross-window keyboard move lands on.
   * Defaults to `0` (today's behaviour). Should be a stable value.
   */
  readonly scrollMargin?: number;
}

/** A single item in the currently rendered window. */
export interface VirtualItem {
  /** Index of the item in the full list. */
  readonly index: number;
  /** Stable key (from `getItemKey`, or the index). */
  readonly key: string | number;
  /** Offset of the item from the start of the scroll container, in pixels. */
  readonly start: number;
  /** Size of the item along the scroll axis, in pixels. */
  readonly size: number;
}

/** Reactive handle returned by {@link injectVirtualizer}. */
export interface ForVirtualizer {
  /** The items in the currently visible window plus overscan. */
  readonly virtualItems: Signal<readonly VirtualItem[]>;
  /** Total scroll size of all items, in pixels (drives the spacer element). */
  readonly totalSize: Signal<number>;
  /**
   * The inclusive-exclusive `[firstIndex, lastIndex + 1)` index window currently
   * rendered (visible window plus overscan), or `[0, 0]` when nothing is rendered.
   * Plugs straight into a list primitive's `[visibleRange]`-style input (e.g.
   * `[forCombobox][visibleRange]`) so windowing composes without the consumer
   * re-deriving the range from {@link ForVirtualizer.virtualItems}.
   */
  readonly range: Signal<readonly [number, number]>;
  /** Scroll the container so the item at `index` is in view. */
  scrollToIndex(index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }): void;
  /** Scroll the container to an absolute pixel offset. */
  scrollToOffset(offset: number): void;
  /**
   * Record the measured size of a rendered item element (dynamic sizes).
   * Passing `null` sweeps detached (evicted) elements from the measurement
   * cache and stops observing them, so recycled rows scrolled out of the window
   * are not retained/observed until the directive is destroyed.
   */
  measureElement(element: HTMLElement | null): void;
  /**
   * The item at `index` as computed from the core's measurement cache — its
   * `start` reflects measured sizes and `scrollMargin`, not pure estimate math.
   * Returns `null` before the core has mounted or when `index` is out of range.
   * Used to position a retained (pinned) row on its real offset rather than
   * recomputing it from `estimateSize`.
   */
  measurementFor(index: number): VirtualItem | null;
}

/**
 * Sum of the estimated size of every item: `count` × the estimate when it's
 * uniform, else the per-index estimator summed. Used as the SSR / pre-mount
 * total before the core has measured any item, and shared with the ergonomic
 * viewport layer so the estimate-total math lives in one place.
 */
export function estimateTotal(count: number, estimateSize: (index: number) => number): number {
  let total = 0;
  for (let index = 0; index < count; index++) {
    total += estimateSize(index);
  }
  return total;
}

function toVirtualItem(item: CoreVirtualItem): VirtualItem {
  return {
    index: item.index,
    key: item.key as string | number,
    start: item.start,
    size: item.size,
  };
}

function virtualItemsEqual(a: readonly VirtualItem[], b: readonly VirtualItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x.index !== y.index || x.key !== y.key || x.start !== y.start || x.size !== y.size) {
      return false;
    }
  }
  return true;
}

/**
 * Headless windowing core: given a reactive item count, a size estimator and a
 * scroll container, returns the slice of items currently visible (plus
 * overscan), the total scroll size, and imperative scroll/measure helpers. The
 * consumer renders the items with their own `@for` and applies the position
 * transform — this primitive owns no DOM.
 *
 * Backed by `@tanstack/virtual-core`. SSR-safe: off-browser it returns an empty
 * window and the estimate-based total without touching `document`/`window`; the
 * first real window is produced after the first browser render.
 *
 * Must be called from an injection context (a component/directive constructor
 * or field initializer).
 *
 * @param options Reactive count, size estimator, scroll element and tuning.
 * @returns A {@link ForVirtualizer} handle of signals + imperative methods.
 */
export function injectVirtualizer(options: VirtualizerOptions): ForVirtualizer {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return {
      virtualItems: signal<readonly VirtualItem[]>([]).asReadonly(),
      totalSize: computed(() => estimateTotal(options.count(), options.estimateSize)),
      range: computed<readonly [number, number]>(() => [0, 0]),
      scrollToIndex: () => undefined,
      scrollToOffset: () => undefined,
      measureElement: () => undefined,
      measurementFor: () => null,
    };
  }

  const horizontal = (options.orientation ?? 'vertical') === 'horizontal';
  const overscan = options.overscan ?? DEFAULT_OVERSCAN;
  const scrollMargin = options.scrollMargin ?? 0;
  const notify = signal(0, { equal: () => false });
  const mounted = signal(false);

  const buildCoreOptions = (
    count: number,
    scrollElement: HTMLElement | null,
  ): CoreVirtualizerOptions<HTMLElement, HTMLElement> => ({
    count,
    getScrollElement: () => scrollElement,
    estimateSize: options.estimateSize,
    getItemKey: options.getItemKey,
    overscan,
    horizontal,
    scrollMargin,
    scrollToFn: elementScroll,
    observeElementRect,
    observeElementOffset,
    onChange: () => notify.set(0),
  });

  const virtualizer = new Virtualizer<HTMLElement, HTMLElement>(
    buildCoreOptions(options.count(), options.scrollElement()),
  );

  // @sanctioned-effect(external-source): `notify` is a change-notification
  // bridge from the imperative `@tanstack/virtual-core` core into the signal
  // graph. When `count` / `scrollElement` change the core is reconfigured
  // imperatively (`setOptions` + `_willUpdate`), so `notify.set(0)` forces the
  // `virtualItems` / `totalSize` computeds to re-read it. The effect never reads
  // `notify`, so there is no self-cycle.
  effect(() => {
    virtualizer.setOptions(buildCoreOptions(options.count(), options.scrollElement()));
    virtualizer._willUpdate();
    notify.set(0);
  });

  let cleanup: (() => void) | undefined;
  afterNextRenderCancellable(() => {
    cleanup = virtualizer._didMount();
    mounted.set(true);
  });
  inject(DestroyRef).onDestroy(() => cleanup?.());

  const virtualItems = computed<readonly VirtualItem[]>(
    () => {
      notify();
      if (!mounted()) return [];
      return virtualizer.getVirtualItems().map(toVirtualItem);
    },
    { equal: virtualItemsEqual },
  );

  const totalSize = computed<number>(() => {
    notify();
    if (!mounted()) return estimateTotal(options.count(), options.estimateSize);
    return virtualizer.getTotalSize();
  });

  const range = computed<readonly [number, number]>(() => {
    const items = virtualItems();
    if (items.length === 0) return [0, 0];
    return [items[0]!.index, items[items.length - 1]!.index + 1];
  });

  return {
    virtualItems,
    totalSize,
    range,
    scrollToIndex: (index, scrollOptions) => virtualizer.scrollToIndex(index, scrollOptions),
    scrollToOffset: (offset) => virtualizer.scrollToOffset(offset),
    measureElement: (element) => virtualizer.measureElement(element),
    measurementFor: (index) => {
      if (!mounted() || index < 0 || index >= options.count()) {
        return null;
      }
      const measurement = virtualizer.measurementsCache[index];
      return measurement === undefined ? null : toVirtualItem(measurement);
    },
  };
}
