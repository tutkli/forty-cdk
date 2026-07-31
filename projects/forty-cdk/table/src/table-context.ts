import { booleanAttribute, inject, InjectionToken, isDevMode, type Signal } from '@angular/core';

import {
  TABLE_REGISTRATION_CONTEXT,
  TABLE_ROW_REGISTRATION_CONTEXT,
  type TableRegistrationContext,
  type TableRowRegistrationContext,
  type WritingDirection,
} from 'forty-cdk/core';

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
 * Consumer-facing coordination surface owned by `ForTable`: the resolved ARIA
 * mode / direction / selection mode, the ARIA index arithmetic, the roving-grid
 * queries, and the selection / expansion commands.
 *
 * It deliberately carries **no** piece-registration protocol. How header rows,
 * header cells, data rows, the declarative body's row count, the virtualization
 * seams and the resized column widths wire themselves into the root is the
 * library's own business and changes without notice, so it lives on a separate
 * `TABLE_REGISTRATION_CONTEXT` no entry point exports.
 */
export interface ForTableContext {
  /** The resolved ARIA mode; cells derive `role` (`cell` vs `gridcell`) from it, and navigation engages when it is not `'table'`. */
  readonly mode: Signal<TableMode>;
  /** The resolved writing direction (flips ArrowLeft / ArrowRight in `rtl`). */
  readonly dir: Signal<WritingDirection>;
  /** The active row-selection mode. `'none'` means selection is disabled. */
  readonly selectionMode: Signal<TableSelectionMode>;
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
   * Absolute index of the row that owns the currently roving-focused cell, or `null`
   * when no cell is focused (or the focused row carries no `virtualIndex`). Read by
   * `[forTableVirtualized]` to keep the focused row mounted across recycling.
   */
  readonly focusedRowIndex: Signal<number | null>;
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

/**
 * Per-row read surface owned by `ForTableRow`, injected by its data cells. The
 * cell-registration half lives on {@link TableRowContext}, so no `register*`
 * member reaches `ForTableRow`'s emitted public type.
 */
export interface ForTableRowContext {
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

const TRACK_BREAKOUT_PATTERN = /[;{}"']|\/\*/;

/**
 * Dev-mode guard for a `grid-template-columns` track fragment before it is
 * interpolated into the derived track string. Unlike a column name a track
 * fragment has an open vocabulary (`minmax()`, `fit-content()`, `calc()`,
 * `clamp()`, `var()`), so this rejects only the shapes that **escape** the value
 * they are written into and collapse the whole track with no error: an empty
 * fragment (which contributes a missing entry and shifts every later column —
 * omit the input, or pass `null`, to mean "unset"), a `;` / `{` / `}` / quote /
 * `/*` that terminates the declaration, and unbalanced parentheses (a stray `)`
 * in a `fallbackWidth` closes its enclosing `var(` early and swallows the rest
 * of the track). No-op in production builds.
 */
export function assertColumnTrack(track: string, input: string, piece: string): void {
  if (!isDevMode()) {
    return;
  }
  const reason = columnTrackDefect(track);
  if (reason) {
    throw new Error(
      `[forty-cdk/table] Invalid ${input} ${JSON.stringify(track)} declared on ${piece}: ` +
        `${reason}. A track fragment is interpolated into the grid-template-columns string ` +
        `derived by ForTableBody, where it would silently produce an invalid declaration and ` +
        `collapse the layout with no error.`,
    );
  }
}

function columnTrackDefect(track: string): string | null {
  if (track.trim() === '') {
    return 'the fragment is empty — omit the input (or pass null) to leave the track unset';
  }
  if (TRACK_BREAKOUT_PATTERN.test(track)) {
    return 'it contains a ";", "{", "}", quote, or "/*" that terminates the declaration';
  }
  let depth = 0;
  for (const char of track) {
    if (char === '(') {
      depth++;
    } else if (char === ')' && --depth < 0) {
      return 'its parentheses are unbalanced';
    }
  }
  return depth === 0 ? null : 'its parentheses are unbalanced';
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

export function injectTableRegistration(piece: string): TableRegistrationContext {
  const ctx = inject(TABLE_REGISTRATION_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/table] ${piece} must be used inside a [forTable] element.`);
  }
  return ctx;
}

export function injectTableRowRegistration(piece: string): TableRowRegistrationContext {
  const ctx = inject(TABLE_ROW_REGISTRATION_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/table] ${piece} must be used inside a [forTableRow] element.`);
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
