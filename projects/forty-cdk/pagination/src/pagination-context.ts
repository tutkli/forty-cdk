import { inject, InjectionToken, type Signal } from '@angular/core';

import type { PaginationItem } from './pagination-range';

/**
 * Coordination contract owned by `ForPagination`. Page buttons, previous, and
 * next pieces inject it to read the current page / derived list and drive
 * navigation from a single source of truth.
 */
export interface ForPaginationContext {
  /** Current 1-based page. */
  readonly page: Signal<number>;
  /** Total number of pages. */
  readonly count: Signal<number>;
  /** Whether the whole control is disabled. */
  readonly disabled: Signal<boolean>;
  /** The computed visible-page list (page numbers + ellipsis gaps). */
  readonly items: Signal<readonly PaginationItem[]>;
  /** Whether the current page is the first (no previous page). */
  readonly isFirst: Signal<boolean>;
  /** Whether the current page is the last (no next page). */
  readonly isLast: Signal<boolean>;

  /** Navigate to `page`, clamped to `[1, count]`. No-op when disabled. */
  goToPage(page: number): void;
  /** Navigate to the previous page. No-op at the first page or when disabled. */
  previous(): void;
  /** Navigate to the next page. No-op at the last page or when disabled. */
  next(): void;
}

/** DI token providing the pagination context to descendant pieces. */
export const FOR_PAGINATION_CONTEXT = new InjectionToken<ForPaginationContext>(
  'FOR_PAGINATION_CONTEXT',
);

export function injectPaginationContext(piece: string): ForPaginationContext {
  const ctx = inject(FOR_PAGINATION_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/pagination] ${piece} must be used inside a [forPagination] element.`,
    );
  }
  return ctx;
}
