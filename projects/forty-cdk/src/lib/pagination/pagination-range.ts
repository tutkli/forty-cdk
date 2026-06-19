/**
 * One entry in the computed visible-page list: either a clickable page number
 * or an ellipsis gap standing in for a collapsed run of pages.
 */
export interface PaginationItem {
  /** Discriminator: a real page button, or a non-interactive ellipsis gap. */
  readonly type: 'page' | 'ellipsis';
  /** 1-based page number. Present only when `type` is `'page'`. */
  readonly value?: number;
}

function range(start: number, end: number): number[] {
  const length = end - start + 1;
  return Array.from({ length }, (_, i) => start + i);
}

/**
 * Compute the visible page list (with ellipsis gaps) for the given pagination
 * state, using the standard boundary/sibling algorithm:
 *
 * - `boundaryCount` pages are always shown at each end.
 * - `siblingCount` pages are shown on each side of the current `page`.
 * - Runs of hidden pages collapse to a single `'ellipsis'` entry — except a gap
 *   of exactly one page, which is shown as that page rather than an ellipsis.
 *
 * Returns an empty list when `count` is not positive. All page numbers are
 * 1-based. Internal — not re-exported from `public-api.ts`.
 */
export function computePaginationItems(opts: {
  page: number;
  count: number;
  siblingCount: number;
  boundaryCount: number;
}): PaginationItem[] {
  const { page, count, siblingCount, boundaryCount } = opts;
  if (count <= 0) {
    return [];
  }

  const startPages = range(1, Math.min(boundaryCount, count));
  const endPages = range(Math.max(count - boundaryCount + 1, boundaryCount + 1), count);

  const siblingsStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );

  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0]! - 2 : count - 1,
  );

  const tokens: (number | 'ellipsis')[] = [
    ...startPages,
    ...(siblingsStart > boundaryCount + 2
      ? ['ellipsis' as const]
      : boundaryCount + 1 < count - boundaryCount
        ? [boundaryCount + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < count - boundaryCount - 1
      ? ['ellipsis' as const]
      : count - boundaryCount > boundaryCount
        ? [count - boundaryCount]
        : []),
    ...endPages,
  ];

  return tokens.map((t) => (t === 'ellipsis' ? { type: 'ellipsis' } : { type: 'page', value: t }));
}
