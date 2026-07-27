import { InjectionToken, type Signal } from '@angular/core';

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
 * through the shared registration surface.
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

/**
 * The table's piece-registration protocol: how header rows, header cells, data
 * rows, the declarative body's row count, the virtualization seams and the
 * resized column widths wire themselves into the `[forTable]` root.
 *
 * Deliberately **not** part of `ForTableContext` and never re-exported from a
 * public entry point. It lives in the core internal tier because
 * `forty-cdk/virtualization`'s `[forTableVirtualized]` registers through it from
 * a second entry point, and a consumer must not be able to name — let alone
 * call — the wiring protocol the library refactors freely.
 */
export interface TableRegistrationContext {
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
  /** Registers a data row so it joins the row index space and the navigation grid. */
  registerRow(handle: ForTableRowHandle): void;
  /** Unregisters a data row. Reference-based. */
  unregisterRow(handle: ForTableRowHandle): void;
  /**
   * Live registered data rows in DOM order. `[forTableVirtualized]` reads this to
   * resolve a pending cross-window navigation once the target row mounts, and
   * `[forTableRowReorder]` to map a pointer target back onto a row handle.
   */
  readonly rows: Signal<readonly ForTableRowHandle[]>;
  /**
   * Registers (or clears, with `null`) the declarative `<for-table-body>`'s dataset
   * length as the body-derived total row count. `ForTableBody` registers
   * `computed(() => rows().length)` at construction and clears it on destroy, so a
   * declarative table needs no `[rowCount]` binding; an explicit `[rowCount]` input
   * still wins over it (for a server-known total larger than the loaded rows).
   */
  registerBodyRowCount(count: Signal<number> | null): void;
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
   * Sets (or clears, with `null`) the absolute index of the row being
   * pointer-reordered. Called by `[forTableRowReorder]`; read by
   * `[forTableVirtualized]` to retain the lifted row in the rendered window.
   */
  setReorderingRow(index: number | null): void;
  /**
   * Absolute index of the row currently being pointer-reordered (set by
   * `[forTableRowReorder]` on lift, cleared on release), or `null` when no row is
   * being reordered. `[forTableVirtualized]` keeps this row mounted for the
   * duration of the drag so auto-scroll cannot unmount the lifted row and desync
   * the emitted drop indices. `null` and unused outside a virtualized table.
   */
  readonly reorderingRowIndex: Signal<number | null>;
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
}

/**
 * A row's cell-registration protocol: how `[forTableCell]` joins its
 * `[forTableRow]` so the row can order its cells for `aria-colindex` and the
 * root can flatten them into the roving grid.
 *
 * Lives here beside {@link TableRegistrationContext} rather than in
 * `forty-cdk/table`, so `ForTableCellHandle` never has to surface in the table
 * entry point's emitted types — the row's public read surface stays free of it.
 */
export interface TableRowRegistrationContext {
  /** Registers a data cell with this row. */
  registerCell(handle: ForTableCellHandle): void;
  /** Unregisters a data cell. Reference-based. */
  unregisterCell(handle: ForTableCellHandle): void;
}

/** DI token carrying a row's {@link TableRowRegistrationContext}. Provided by `[forTableRow]`. */
export const TABLE_ROW_REGISTRATION_CONTEXT = new InjectionToken<TableRowRegistrationContext>(
  'TABLE_ROW_REGISTRATION_CONTEXT',
);

/** DI token carrying the table's {@link TableRegistrationContext}. Provided by `[forTable]`. */
export const TABLE_REGISTRATION_CONTEXT = new InjectionToken<TableRegistrationContext>(
  'TABLE_REGISTRATION_CONTEXT',
);
