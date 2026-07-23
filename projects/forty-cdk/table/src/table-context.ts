import { booleanAttribute, inject, InjectionToken, isDevMode, type Signal } from '@angular/core';

import { type WritingDirection } from 'forty-cdk/core';

/** ARIA pattern the table renders as. `'table'` is the static structure; `'grid'` / `'treegrid'` add roving + 2D keyboard navigation. */
export type TableMode = 'table' | 'grid' | 'treegrid';

/** Row-selection mode for `ForTable`. `'none'` disables selection. */
export type TableSelectionMode = 'none' | 'single' | 'multiple';

/** How a row click mutates selection. `'toggle'` flips it; `'replace'` replaces (modifier-aware). */
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
 * A single row in a {@link TableVirtualWindow}: its absolute dataset index and
 * pixel offset from the start of the scroll range.
 */
export interface TableVirtualRow {
  /** Absolute 0-based index of this row in the full dataset. */
  readonly index: number;
  /** Pixel offset of this row from the start of the scroll range. */
  readonly start: number;
}

/**
 * A rendered virtual window published by `[forTableVirtualized]` for the
 * declarative `<for-table-body>` to render. It lets the body render only the
 * windowed rows — each absolutely positioned inside a full-height sizer —
 * instead of iterating the whole `rows` input, without `forty-cdk/table`
 * importing the virtualization core. Mirrors {@link TableVirtualRowNavigation}:
 * the virtualization companion owns the windowing math and publishes the result
 * through the shared table context.
 */
export interface TableVirtualWindow {
  /**
   * The rows to render this frame — the visible window plus overscan and the
   * retained focused / reordering rows, each carrying its absolute dataset
   * `index` and pixel `start`. `<for-table-body>` indexes its `rows` input by
   * `index` and positions each row at `translateY(start)`.
   */
  readonly rows: Signal<readonly TableVirtualRow[]>;
  /**
   * Total scroll height of the full dataset in px. Applied to the body's
   * rowgroup so the scrollbar spans the whole set while only the window mounts.
   */
  readonly totalSize: Signal<number>;
  /**
   * Record a stamped row element's real measured height, so the virtualizer
   * replaces the `estimateRowSize` estimate with it and re-aligns the offsets of
   * the rows below. Implemented by `[forTableVirtualized]`; `<for-table-body>`
   * calls it once per stamped row (browser-only, after render) when its
   * `measureRows` input is set, so a window mixing row shapes (denser variant
   * rows, group separators) stays contiguous after scroll. The element must
   * carry the `data-index` attribute the body stamps.
   *
   * `<for-table-body>` also calls it with `null` after measuring the rendered
   * rows to sweep detached rows recycled out of the window, evicting them from
   * the virtualizer's measurement cache so they are not retained/observed until
   * the directive is destroyed.
   */
  measureRow(element: HTMLElement | null): void;
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
   * `direction` (`+1` down / `-1` up) is the travel sense of the originating
   * grid action, so the bridge can step over full-span variant rows — which
   * register no cells — onto the adjacent data row.
   */
  navigateTo(rowIndex: number, column: number, direction: 1 | -1): void;
  /**
   * Scroll the virtualizer so the row at the absolute `index` is in the window.
   * Used by `[forTableRowReorder]` to follow a keyboard reorder target across
   * the rendered window without taking a direct dependency on `ForTableVirtualized`.
   */
  scrollToRow(index: number): void;
  /**
   * The bounding rect of the scroll container along the visible viewport, or
   * `null` before it is available. `[forTableRowReorder]` reads it to map a
   * modifier-held pointer drag onto an absolute dataset index (windowed-scrub
   * drop to a far row), without depending on `ForTableVirtualized` directly.
   */
  scrollViewportRect(): DOMRect | null;
  /**
   * Drop any stashed cross-window target. `ForTable` calls this on the next
   * keyboard interaction that reaches the grid, so a pending move set by an
   * earlier Ctrl+End / Page / Arrow is superseded rather than teleporting focus
   * when a far page later mounts.
   */
  clearPending(): void;
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
  /**
   * Registers a header cell so it can join the roving-navigation grid as the grid's
   * first row, giving the table a single composite tab stop shared with the data
   * cells. Draggable header cells (`[forTableColumnReorder]`) register the same way so
   * a column-reorderable grid stays a single tab stop. Inert in `mode="table"`, where
   * header cells stay static structure and the row does not join any grid.
   */
  registerHeaderCell(handle: ForTableCellHandle): void;
  /** Unregisters a header cell. Reference-based. */
  unregisterHeaderCell(handle: ForTableCellHandle): void;
  /**
   * 1-based `aria-rowindex` for the header row in `grid` / `treegrid` mode (always
   * `1`, since ARIA counts the header row as the grid's first row), or `null` in
   * `mode="table"` where no row index space exists.
   */
  readonly headerRowIndex: Signal<number | null>;
  /**
   * Offset ARIA adds to every data row's 1-based `aria-rowindex` so the numbering
   * counts the header row: `1` when a header row participates in the row-index
   * space (`grid` / `treegrid` mode with a registered header row), else `0`.
   */
  readonly dataRowIndexOffset: Signal<number>;
  /** Roving `tabindex` (`0` for the single tab stop, `-1` otherwise) for a header cell in grid mode. */
  headerCellTabIndex(host: HTMLElement): 0 | -1;
  /** 0-based index of a header cell host among registered header cells in DOM order, or -1 if not registered. */
  headerCellIndexOf(host: HTMLElement): number;
  /**
   * Whether the registered header cells form a complete row that joins the body's
   * roving composite grid (`grid` / `treegrid` mode, header cell count matches the
   * data column count). Draggable header cells (`[forTableColumnReorder]`) participate
   * too, so a column-reorderable grid stays a single composite tab stop. `false` in
   * `table` mode or when no header cells registered.
   */
  readonly headerParticipatesInRoving: Signal<boolean>;
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
  /**
   * Resolves grid navigation for a header cell that yields its host interaction to a
   * co-located `[forDraggable]`. `[forTableColumnReorder]` calls this from a
   * capture-phase listener for idle header cells so Arrow / Home / End / Page keys move
   * roving focus across the composite header + body grid, while Space / Enter fall
   * through to the draggable's lift. Returns `true` when the key was consumed as a grid
   * action, `false` otherwise (including outside a participating `grid` / `treegrid`).
   */
  handleHeaderCellKeydown(event: KeyboardEvent, host: HTMLElement): boolean;
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
  /**
   * Removes a column's published `--for-table-col-<column>-width` custom property
   * from the table root. Called by `[forTableColumnResizer]` when its width resets
   * to `undefined` or the handle is destroyed, so a stale track var cannot survive
   * a width reset or resurrect when the column is re-added.
   */
  removeColumnWidth(column: string): void;
  /**
   * The resolved true total data-row count for `aria-rowcount` and the virtualized
   * scroll range, in resolution order: the explicit `[rowCount]` input when set,
   * else the declarative `<for-table-body>`'s dataset length when a body has
   * registered one, else `undefined` (readers fall back to the rendered row count).
   */
  readonly rowCount: Signal<number | undefined>;
  /**
   * The count of currently loaded data rows (the declarative `<for-table-body>`
   * dataset length), or `undefined` when no body has registered one (raw-primitive
   * rendering). Distinct from `rowCount`, which an explicit `[rowCount]` raises to a
   * server-known total larger than the loaded rows; cross-window navigation clamps
   * unmounted targets to this so a target beyond the loaded prefix cannot stash a
   * pending focus move that resolves only when a far page later loads.
   */
  readonly loadedRowCount: Signal<number | undefined>;
  /**
   * Registers (or clears, with `null`) the declarative `<for-table-body>`'s dataset
   * length as the body-derived total row count. `ForTableBody` registers
   * `computed(() => rows().length)` at construction and clears it on destroy, so a
   * declarative table needs no `[rowCount]` binding; an explicit `[rowCount]` input
   * still wins over it (for a server-known total larger than the loaded rows).
   */
  registerBodyRowCount(count: Signal<number> | null): void;
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
   * The currently registered cross-window row-navigation delegate, or `null`
   * when the table is not virtualized. `[forTableRowReorder]` reads this to gate
   * keyboard reordering to virtualized tables and to scroll the reorder target
   * into view, without taking a direct dependency on `ForTableVirtualized`.
   */
  readonly virtualRowNavigation: Signal<TableVirtualRowNavigation | null>;
  /**
   * Registers (or clears, with `null`) the rendered virtual window.
   * `[forTableVirtualized]` registers itself so the declarative
   * `<for-table-body>` renders only the windowed rows without importing the
   * virtualization core. No-op for tables built from the raw `[forTableRow]`
   * primitives, which render their own window.
   */
  registerVirtualWindow(window: TableVirtualWindow | null): void;
  /**
   * The currently registered virtual window, or `null` when the table is not
   * virtualized (or is built from the raw `[forTableRow]` primitives directly).
   * `<for-table-body>` reads this to switch between rendering the full `rows`
   * input and rendering only the window inside a full-height sizer.
   */
  readonly virtualWindow: Signal<TableVirtualWindow | null>;
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

const COLUMN_NAME_PATTERN = /^[-_A-Za-z0-9]+$/;

/**
 * Dev-mode guard for a column name before it is interpolated into CSS. Column
 * names flow into the `--for-table-col-<name>-width` custom property and the
 * `grid-template-columns` track string, where a space, `)`, `;`, or quote would
 * silently produce an invalid declaration and collapse the layout with no error.
 * Rejects any name outside letters, digits, hyphens, and underscores. No-op in
 * production builds.
 */
export function assertColumnName(name: string, piece: string): void {
  if (isDevMode() && !COLUMN_NAME_PATTERN.test(name)) {
    throw new Error(
      `[forty-cdk/table] Invalid column name ${JSON.stringify(name)} declared on ${piece}. ` +
        `Column names are interpolated into CSS custom-property names ` +
        `(--for-table-col-<name>-width) and grid-template-columns, so they may contain ` +
        `only letters, digits, hyphens, and underscores.`,
    );
  }
}

/**
 * Whether a header-cell host carries a drag-drop reorder affordance
 * (`[forDraggable]` or `[forFreeDrag]`). Detected by DOM marker rather than a
 * value-import of the drag-drop context, so the sort header and header cell can
 * yield their roving `tabindex` to the draggable's own tab stop without a
 * cross-primitive value dependency (only consumers importing drag-drop bundle it).
 */
export function hostHasDraggable(el: HTMLElement): boolean {
  return el.hasAttribute('forDraggable') || el.hasAttribute('forFreeDrag');
}

/**
 * Whether a header-cell host carries an active sort affordance — a
 * `[forTableSortHeader]` with `sortable` currently `true`, reflected as the
 * `data-sortable` marker. Detected by DOM marker rather than a value-import of
 * the sort header, so the grid cell-entry handler can defer `Enter` to the sort
 * activation (keeping focus on the cell) without a cross-piece value dependency.
 * A non-sortable header (no marker) keeps `Enter` as its cell-entry key.
 */
export function hostHasSortActivation(el: HTMLElement): boolean {
  return el.hasAttribute('data-sortable');
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
