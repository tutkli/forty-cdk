import { booleanAttribute, inject, InjectionToken, type Signal } from '@angular/core';

import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';

/** ARIA pattern the table renders as. `'table'` is the static structure; `'grid'` / `'treegrid'` add roving + 2D keyboard navigation. */
export type TableMode = 'table' | 'grid' | 'treegrid';

/** Sticky placement for a cell: pinned to the start edge (`true`), the end edge (`'end'`), or not sticky (`false`). */
export type TableStickyValue = boolean | 'end';

/**
 * Handle a `ForTableCell` registers with its parent `ForTableRow`, so the row can
 * order its cells (for `aria-colindex`) and the root can flatten them into the
 * roving-navigation grid (skipping disabled cells).
 */
export interface ForTableCellHandle {
  /** The cell's host element (`role="cell"` / `"gridcell"`). */
  readonly host: HTMLElement;
  /** Whether this cell is disabled — skipped during arrow-key navigation. */
  readonly disabled: Signal<boolean>;
}

/**
 * Handle a `ForTableRow` registers with the root `ForTable`, so the root can order
 * rows (for `aria-rowindex`) and build the row-major flat cell grid for navigation.
 */
export interface ForTableRowHandle {
  /** The row's host element (`role="row"`). */
  readonly host: HTMLElement;
  /** This row's data cells, in DOM order. */
  readonly cells: Signal<readonly ForTableCellHandle[]>;
}

/** Coordination contract owned by `ForTable`, injected by every descendant piece. */
export interface ForTableContext {
  /** The resolved ARIA mode; cells derive `role` (`cell` vs `gridcell`) from it, and navigation engages when it is not `'table'`. */
  readonly mode: Signal<TableMode>;
  /** The resolved writing direction (flips ArrowLeft / ArrowRight in `rtl`). */
  readonly dir: Signal<WritingDirection>;
  /** Registers the header row's host so the root can measure its height for the sticky-header CSS var. */
  registerHeaderRow(el: HTMLElement): void;
  /** Unregisters the header row's host. Reference-based; safe to call if never registered. */
  unregisterHeaderRow(el: HTMLElement): void;
  /** Registers a data row so it joins the row index space and the navigation grid. */
  registerRow(handle: ForTableRowHandle): void;
  /** Unregisters a data row. Reference-based. */
  unregisterRow(handle: ForTableRowHandle): void;
  /** 0-based index of a data row host in DOM order, or -1 if not registered. */
  rowIndexOf(host: HTMLElement): number;
  /** Roving `tabindex` (`0` for the single tab stop, `-1` otherwise) for a data cell in grid mode. */
  cellTabIndex(host: HTMLElement): 0 | -1;
  /** Whether a data cell is the currently roving-focused cell (drives `data-highlighted`). */
  isCellHighlighted(host: HTMLElement): boolean;
  /** Promotes a data cell to the active roving cell (called on the cell's `(focus)`). */
  activateCell(host: HTMLElement): void;
  /** Resolves and applies a keydown originating on a data cell: 2D move + focus. */
  handleCellKeydown(event: KeyboardEvent, host: HTMLElement): void;
}

export const FOR_TABLE_CONTEXT = new InjectionToken<ForTableContext>('FOR_TABLE_CONTEXT');

/** Per-row coordination contract owned by `ForTableRow`, injected by its data cells. */
export interface ForTableRowContext {
  /** Registers a data cell with this row. */
  registerCell(handle: ForTableCellHandle): void;
  /** Unregisters a data cell. Reference-based. */
  unregisterCell(handle: ForTableCellHandle): void;
  /** 0-based index of a cell host within this row in DOM order, or -1 if not registered. */
  cellIndexOf(host: HTMLElement): number;
}

export const FOR_TABLE_ROW_CONTEXT = new InjectionToken<ForTableRowContext>(
  'FOR_TABLE_ROW_CONTEXT',
);

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

export function injectTableRowContext(piece: string): ForTableRowContext {
  const ctx = inject(FOR_TABLE_ROW_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/table] ${piece} must be used inside a [forTableRow] element.`);
  }
  return ctx;
}
