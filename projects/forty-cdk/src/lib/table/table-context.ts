import { booleanAttribute, inject, InjectionToken, type Signal } from '@angular/core';

import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';

/** ARIA pattern the table renders as. `'table'` is the static structure; `'grid'` / `'treegrid'` are reserved for later epic phases. */
export type TableMode = 'table' | 'grid' | 'treegrid';

/** Sticky placement for a cell: pinned to the start edge (`true`), the end edge (`'end'`), or not sticky (`false`). */
export type TableStickyValue = boolean | 'end';

/** Coordination contract owned by `ForTable`, injected by every descendant piece. */
export interface ForTableContext {
  /** The resolved ARIA mode; cells derive `role` (`cell` vs `gridcell`) from it. */
  readonly mode: Signal<TableMode>;
  /** The resolved writing direction. */
  readonly dir: Signal<WritingDirection>;
  /** Registers the header row's host so the root can measure its height for the sticky-header CSS var. */
  registerHeaderRow(el: HTMLElement): void;
  /** Unregisters the header row's host. Reference-based; safe to call if never registered. */
  unregisterHeaderRow(el: HTMLElement): void;
}

export const FOR_TABLE_CONTEXT = new InjectionToken<ForTableContext>('FOR_TABLE_CONTEXT');

/**
 * Coerces the `sticky` input value for header and data cells.
 * The string `'end'` pins the cell to the end edge; any other truthy value
 * (including the empty string from a bare `sticky` attribute) pins it to the
 * start edge; a falsy value means not sticky.
 */
export function coerceSticky(value: boolean | string): TableStickyValue {
  return value === 'end' ? 'end' : booleanAttribute(value);
}

export function injectTableContext(piece: string): ForTableContext {
  const ctx = inject(FOR_TABLE_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/table] ${piece} must be used inside a [forTable] element.`);
  }
  return ctx;
}
