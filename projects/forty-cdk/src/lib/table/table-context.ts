import { booleanAttribute, inject, InjectionToken, type Signal } from '@angular/core';

import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';

/** ARIA pattern the table renders as. `'table'` is the static structure; `'grid'` / `'treegrid'` add roving + 2D keyboard navigation. */
export type TableMode = 'table' | 'grid' | 'treegrid';

/** Row-selection mode for `ForTable`. `'none'` disables selection. */
export type TableSelectionMode = 'none' | 'single' | 'multiple';

/** How a row click mutates selection. `'toggle'` flips it; `'replace'` replaces (modifier-aware), React-Aria semantics. */
export type TableSelectionBehavior = 'toggle' | 'replace';

/** Aggregate selection state across the table's selectable rows, for the select-all tri-state. */
export type TableSelectAllState = 'none' | 'some' | 'all';

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
  /** This row's selection identity, from its `[value]` input; `undefined` when unset (not selectable). */
  readonly value: Signal<unknown>;
  /** 1-based tree depth of this row (`aria-level`); always `1` outside treegrid mode. */
  readonly level: Signal<number>;
  /** Whether this row is an expandable parent (drives `aria-expanded` / `data-state`). */
  readonly expandable: Signal<boolean>;
  /** Absolute 0-based index of this row in the full (virtualized) dataset, or `null` when not virtualized. */
  readonly virtualIndex: Signal<number | null>;
}

/**
 * Cross-window row-navigation delegate registered by `[forTableVirtualized]`.
 * `ForTable` consults it when a grid keyboard action resolves a row outside the
 * rendered window, keeping the virtualization bridge out of `ForTable` itself.
 */
export interface TableVirtualRowNavigation {
  /**
   * Move roving focus to the data cell at the absolute `(rowIndex, 0-based
   * column)`, scrolling that row into the window first when it is not mounted.
   */
  navigateTo(rowIndex: number, column: number): void;
}

/** Coordination contract owned by `ForTable`, injected by every descendant piece. */
export interface ForTableContext {
  /** The resolved ARIA mode; cells derive `role` (`cell` vs `gridcell`) from it, and navigation engages when it is not `'table'`. */
  readonly mode: Signal<TableMode>;
  /** The resolved writing direction (flips ArrowLeft / ArrowRight in `rtl`). */
  readonly dir: Signal<WritingDirection>;
  /** The active row-selection mode. `'none'` means selection is disabled. */
  readonly selectionMode: Signal<TableSelectionMode>;
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
  /** Returns whether `value` is currently in the selection. */
  isRowSelected(value: unknown): boolean;
  /** Toggles `value` in or out of the selection, respecting `selectionMode`. No-op in `'none'` mode. */
  toggleRowSelection(value: unknown): void;
  /**
   * Applies a row selection click with optional modifier keys, honoring `selectionBehavior`:
   * `'toggle'` always flips; `'replace'` replaces (Ctrl/Cmd toggles a single item,
   * Shift extends a range in multiple mode).
   */
  selectRow(
    value: unknown,
    modifiers?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
  ): void;
  /** Aggregate selection state across all selectable rows (`'none'` / `'some'` / `'all'`). */
  readonly selectAllState: Signal<TableSelectAllState>;
  /** Selects all selectable rows when not all are selected; clears when all are. No-op outside `'multiple'` mode. */
  toggleSelectAll(): void;
  /**
   * Publishes a column's resolved width as the CSS custom property
   * `--for-table-col-<column>-width` on the table root, so the consumer's layout
   * can apply it. Called by `[forTableColumnResizer]`.
   */
  setColumnWidth(column: string, width: number): void;
  /** The consumer-declared true total row count (`aria-rowcount`); `undefined` when defaulted to the rendered count. */
  readonly rowCount: Signal<number | undefined>;
  /**
   * Absolute index of the row that owns the currently roving-focused cell, or `null`
   * when no cell is focused (or the focused row carries no `virtualIndex`). Used by
   * `[forTableVirtualized]` to keep the focused row mounted across recycling.
   */
  readonly focusedRowIndex: Signal<number | null>;
  /**
   * Live registered data rows in DOM order. `[forTableVirtualized]` reads this to
   * resolve a pending cross-window navigation once the target row mounts.
   */
  readonly rows: Signal<readonly ForTableRowHandle[]>;
  /**
   * Registers (or clears, with `null`) the cross-window row-navigation delegate.
   * `[forTableVirtualized]` registers itself so row-crossing grid keyboard actions
   * targeting an unmounted row are handled by the virtualization bridge.
   */
  registerVirtualNavigation(navigation: TableVirtualRowNavigation | null): void;
  /**
   * Absolute index of the row currently being pointer-reordered (set by
   * `[forTableRowReorder]` on lift, cleared on release), or `null` when no row is
   * being reordered. `[forTableVirtualized]` keeps this row mounted for the
   * duration of the drag so auto-scroll cannot unmount the lifted row and desync
   * the emitted drop indices. `null` and unused outside a virtualized table.
   */
  readonly reorderingRowIndex: Signal<number | null>;
  /**
   * Sets (or clears, with `null`) the absolute index of the row being
   * pointer-reordered. Called by `[forTableRowReorder]`; read by
   * `[forTableVirtualized]` to retain the lifted row in the rendered window.
   */
  setReorderingRow(index: number | null): void;
  /** Whether `value` is in the open-rows set (`treegrid` expansion). */
  isRowExpanded(value: unknown): boolean;
  /** Toggles a parent row's expansion in/out of `[(expanded)]`. No-op when value is undefined. */
  toggleRowExpansion(value: unknown): void;
  /** 1-based `aria-posinset` for a row host among its same-level siblings (treegrid). */
  rowPosinset(host: HTMLElement): number;
  /** Total `aria-setsize` of a row host's same-level sibling set (treegrid). */
  rowSetsize(host: HTMLElement): number;
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
  /** The active row-selection mode from the root table. */
  readonly selectionMode: Signal<TableSelectionMode>;
  /** Whether this row is currently selected. */
  readonly selected: Signal<boolean>;
  /** Toggles this row's selection. No-op when the row has no `[value]` or mode is `'none'`. */
  toggleSelected(): void;
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
