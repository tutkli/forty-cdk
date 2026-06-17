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
  runInInjectionContext,
  signal,
} from '@angular/core';

import {
  FOR_VIRTUAL_VIEWPORT_CONTEXT,
  type ForVirtualViewportContext,
} from './virtual-viewport-context';
import { type ForVirtualizer, type VirtualItem, injectVirtualizer } from './virtualizer';

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

  /** The total number of items in the full (non-windowed) list. */
  readonly count = computed(() => this.virtualCount());

  readonly #estimateTotal = computed(() => {
    const total = this.virtualCount();
    const estimate = this.estimateSize();
    if (typeof estimate !== 'function') {
      return total * estimate;
    }
    let sum = 0;
    for (let index = 0; index < total; index++) {
      sum += estimate(index);
    }
    return sum;
  });

  /** The items in the currently visible window plus overscan. */
  readonly virtualItems: Signal<readonly VirtualItem[]> = computed(
    () => this.#virtualizer()?.virtualItems() ?? [],
  );

  /** Total scroll size of all items, in pixels (drives the sizer). */
  readonly totalSize = computed(() => this.#virtualizer()?.totalSize() ?? this.#estimateTotal());

  protected readonly sizerWidth = computed(() =>
    this.orientation() === 'horizontal' ? `${this.totalSize()}px` : '100%',
  );

  protected readonly sizerHeight = computed(() =>
    this.orientation() === 'horizontal' ? '100%' : `${this.totalSize()}px`,
  );

  ngOnInit(): void {
    this.#virtualizer.set(
      runInInjectionContext(this.#injector, () =>
        injectVirtualizer({
          count: this.count,
          estimateSize: (index) => {
            const estimate = this.estimateSize();
            return typeof estimate === 'function' ? estimate(index) : estimate;
          },
          scrollElement: this.#scrollElement,
          orientation: this.orientation(),
          overscan: this.overscan(),
          getItemKey: this.getItemKey(),
        }),
      ),
    );
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
}
