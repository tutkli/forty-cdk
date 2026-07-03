import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  linkedSignal,
  model,
  numberAttribute,
} from '@angular/core';

import { type WritingDirection, clamp, injectTextDirection } from 'forty-cdk/core';
import { FOR_PAGINATION_CONTEXT, type ForPaginationContext } from './pagination-context';
import { FOR_PAGINATION_DEFAULTS } from './pagination-defaults';
import { computePaginationItems, type PaginationItem } from './pagination-range';

/**
 * Headless pagination navigation landmark, implementing the
 * [WAI-ARIA `navigation` landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html)
 * with [`aria-current="page"`](https://www.w3.org/TR/wai-aria-1.2/#aria-current) on the active page.
 *
 * Derives the visible page list (with ellipsis gaps) from `page`, `count`,
 * `siblingCount`, and `boundaryCount`. Exposes `items()`, `isFirst()`,
 * `isLast()`, and navigation methods for the consumer template to render.
 *
 * There is no roving tabindex — each page button, previous, and next are their
 * own tab stops. RTL is visual-only: the resolved `dir` reflects on the host
 * for CSS; navigation semantics (previous = decrement, next = increment) never
 * change based on direction.
 *
 * @example
 * ```html
 * <nav forPagination [(page)]="page" [count]="20" ariaLabel="Pagination" #pg="forPagination">
 *   <button forPaginationPrevious ariaLabel="Previous page">‹</button>
 *   @for (item of pg.items(); track $index) {
 *     @if (item.type === 'page') {
 *       <button forPaginationItem [page]="item.value!">{{ item.value }}</button>
 *     } @else {
 *       <span aria-hidden="true">…</span>
 *     }
 *   }
 *   <button forPaginationNext ariaLabel="Next page">›</button>
 * </nav>
 * ```
 */
@Directive({
  selector: '[forPagination]',
  exportAs: 'forPagination',
  host: {
    role: 'navigation',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: [{ provide: FOR_PAGINATION_CONTEXT, useExisting: ForPagination }],
})
export class ForPagination implements ForPaginationContext {
  readonly #defaults = inject(FOR_PAGINATION_DEFAULTS);

  /**
   * Current 1-based page number. Two-way bindable via `[(page)]`. The implicit
   * `pageChange` output emits whenever the directive updates this value (via
   * clicks, previous, or next). Do not add a separate `pageChange` output.
   */
  readonly page = model<number>(1);

  /**
   * Total number of pages. Always bind as `[count]="n"` (a number, not a
   * string). Required.
   */
  readonly count = input.required<number>();

  /**
   * Pages shown on each side of the current page before collapsing to an
   * ellipsis. Default read from `provideForPaginationDefaults` for the
   * surrounding scope (library fallback: `1`).
   */
  readonly siblingCount = input(this.#defaults.siblingCount, { transform: numberAttribute });

  /**
   * Pages always shown at each end (first and last). Default read from
   * `provideForPaginationDefaults` for the surrounding scope (library
   * fallback: `1`).
   */
  readonly boundaryCount = input(this.#defaults.boundaryCount, { transform: numberAttribute });

  /** Whether the entire pagination control is disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute. RTL affects
   * visual layout only — previous/next semantics do not change.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Accessible label for the navigation landmark. Supply this (or point
   * `aria-labelledby` at a visible label element) when the page contains more
   * than one `<nav>`. A `null` or empty value emits no attribute.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * The current page reconciled against `count`, clamped to `[1, max(1,
   * count)]`. A consumer-written out-of-range `page` (e.g. `50` while `count`
   * is `10`) reads through as a real page here, so `aria-current`, the visible
   * list, and previous/next math all track a valid page. The `page` model
   * stays the writable source of truth; navigation writes the reconciled value
   * back into it via `goToPage`.
   */
  readonly effectivePage = linkedSignal<number>(() =>
    clamp(this.page(), 1, Math.max(1, this.count())),
  );

  /** The computed visible-page list (page numbers + ellipsis gaps). */
  readonly items = computed<readonly PaginationItem[]>(() =>
    computePaginationItems({
      page: this.effectivePage(),
      count: this.count(),
      siblingCount: this.siblingCount(),
      boundaryCount: this.boundaryCount(),
    }),
  );

  /** Whether the current page is the first (no previous page). */
  readonly isFirst = computed(() => this.effectivePage() <= 1);

  /** Whether the current page is the last (no next page). */
  readonly isLast = computed(() => this.effectivePage() >= this.count());

  /**
   * Navigate to `page`, clamped to `[1, count]`, and write the reconciled value
   * back into the `page` model so a two-way `[(page)]` binding sees it. No-op
   * when disabled.
   */
  goToPage(page: number): void {
    if (this.disabled()) {
      return;
    }
    const clamped = clamp(page, 1, Math.max(1, this.count()));
    if (clamped !== this.page()) {
      this.page.set(clamped);
    }
  }

  /** Navigate to the previous page. No-op at the first page or when disabled. */
  previous(): void {
    this.goToPage(this.effectivePage() - 1);
  }

  /** Navigate to the next page. No-op at the last page or when disabled. */
  next(): void {
    this.goToPage(this.effectivePage() + 1);
  }
}
