import { computed, Directive, inject, input, model, type Signal, signal } from '@angular/core';

import {
  injectElementSize,
  findFirstFocusable,
  firstEnabledHost,
  type ForTableCellHandle,
  type ForTableRowHandle,
  type GridNavigationAction,
  moveGridIndex,
  resolveGridNavigation,
  resolveTreegridExpandCollapse,
  TABLE_REGISTRATION_CONTEXT,
  type WritingDirection,
  injectTextDirection,
  RovingTabindex,
  hostAriaLabel,
} from 'forty-cdk/core';
import { computeFlatHierarchy } from './flat-hierarchy';
import {
  FOR_TABLE_CONTEXT,
  hostHasSortActivation,
  type ForTableContext,
  type TableMode,
  type TableSelectionMode,
  type TableSelectionBehavior,
  type TableSelectAllState,
} from './table-context';
import { TableRegistry } from './table-registry';
import { TableRowSelection } from './table-row-selection';
import { TableExpansion } from './table-expansion';

/** Grid actions whose target may lie on a row outside the rendered virtualized window. */
const ROW_CROSSING_ACTIONS: ReadonlySet<GridNavigationAction> = new Set([
  'next-row',
  'prev-row',
  'first',
  'last',
  'page-up',
  'page-down',
]);

/**
 * Root of the Table primitive. Sets the ARIA `role` from `mode`, reflects
 * writing direction, and publishes the `--for-table-header-height` CSS custom
 * property (driven by a `ResizeObserver` on the first registered header row)
 * so consumers can `position: sticky` header cells without hard-coding offsets.
 *
 * Implements the [WAI-ARIA Table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
 * and the [WAI-ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).
 *
 * Use `mode="grid"` or `mode="treegrid"` for interactive grid semantics: a
 * single-tab-stop roving group with 2D arrow navigation over data cells.
 * The default `mode="table"` is the static read-only structure.
 */
@Directive({
  selector: '[forTable]',
  exportAs: 'forTable',
  host: {
    '[attr.role]': 'mode()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.dir]': 'dir()',
    '[attr.data-mode]': 'mode()',
    '[style.--for-table-header-height.px]': 'headerSize()?.height ?? null',
    '[attr.aria-rowcount]': 'rowCountAttr()',
    '[attr.aria-colcount]': 'colCountAttr()',
    '[attr.aria-multiselectable]':
      'mode() !== "table" && selectionMode() === "multiple" ? "true" : null',
  },
  providers: [
    TableRegistry,
    { provide: FOR_TABLE_CONTEXT, useExisting: ForTable },
    { provide: TABLE_REGISTRATION_CONTEXT, useExisting: TableRegistry },
  ],
})
export class ForTable<T = unknown> implements ForTableContext {
  /**
   * ARIA role emitted on the host. `'table'` is the default static read-only
   * structure. `'grid'` and `'treegrid'` provide single-tab-stop roving + 2D
   * arrow navigation over data cells.
   */
  readonly mode = input<TableMode>('table');

  /**
   * Accessible label for the table. When set, reflected as `aria-label`.
   * Consumers with a visible caption should prefer pointing native
   * `aria-labelledby` at it instead; this input is the reactive convenience
   * hook for cases where no visible label element exists.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Explicit override for the true total data-row count (`aria-rowcount` and the
   * virtualized scroll range). A declarative `<for-table-body>` supplies this
   * automatically from its `rows` dataset length, so bind `[rowCount]` only for a
   * server-known total larger than the loaded rows; when set it wins over the
   * body-derived count. Defaults to the body count, else the rendered data-row
   * count. Ignored in `mode="table"`.
   */
  readonly _rowCountInput = input<number | undefined>(undefined, { alias: 'rowCount' });

  readonly #registry = inject(TableRegistry);

  /**
   * Resolved true total data-row count: the explicit `[rowCount]` input when set,
   * else the declarative `<for-table-body>`'s dataset length, else `undefined`
   * (readers fall back to the rendered count). Feeds `aria-rowcount`, the
   * cross-window navigation total, and the virtualizer's count.
   */
  readonly rowCount = computed<number | undefined>(
    () => this._rowCountInput() ?? this.#registry.bodyRowCount()?.(),
  );

  /**
   * The count of currently loaded data rows (the declarative `<for-table-body>`
   * dataset length), or `undefined` when no body has registered one (raw-primitive
   * rendering). Distinct from `rowCount`, which an explicit `[rowCount]` raises to a
   * server-known total larger than the loaded rows; cross-window navigation clamps
   * unmounted targets to this so a target beyond the loaded prefix cannot stash a
   * pending focus move that resolves — and steals focus — only when a far page later
   * loads.
   */
  readonly loadedRowCount = computed<number | undefined>(() => this.#registry.bodyRowCount()?.());

  /**
   * True total number of columns for `aria-colcount`. Defaults to the rendered
   * column count (the cells of the first data row that has any). Ignored in
   * `mode="table"`.
   */
  readonly colCount = input<number>();

  /** Row selection mode. `'none'` (default) disables selection entirely. */
  readonly selectionMode = input<TableSelectionMode>('none');

  /**
   * How a row click changes the selection. `'toggle'` (default) flips the clicked
   * row. `'replace'` replaces the selection with the clicked row; Ctrl/Cmd-click
   * toggles a single row and Shift-click extends a range (multiple mode only).
   */
  readonly selectionBehavior = input<TableSelectionBehavior>('toggle');

  /**
   * Two-way bindable selected row values (each row's `[value]`). Single mode keeps
   * 0–1 entries. The implicit `valueChange` fires only on internal mutations
   * (selector / row click / Space / select-all), never on consumer writes. The
   * directive infers the row-value type `T` from this binding.
   */
  readonly value = model<readonly T[]>([]);

  /** Equality comparator for row values. Defaults to `===`; supply id-based for objects. */
  readonly compareWith = input<(a: T, b: T) => boolean>((a, b) => a === b);

  /**
   * Full ordered set of selectable row values (each row's `[value]`), for a
   * virtualized or server-paged table whose aggregate selection operations must
   * span rows beyond the rendered window. When `null` (default), the select-all
   * tri-state, `toggleSelectAll`, and Shift-click range selection compute against
   * the registered (rendered) rows only. When supplied, they use this set as the
   * universe of selectable values, so a range can span unmounted rows and the
   * tri-state reflects the true dataset. Per-row selection is unaffected.
   */
  readonly selectableValues = input<readonly T[] | null>(null);

  /**
   * Two-way bindable open parent-row values (each row's `[value]`), for
   * `mode="treegrid"`. The implicit `expandedChange` fires only on internal
   * expand/collapse (ArrowRight/ArrowLeft, `toggleRowExpansion`), never on
   * consumer writes through `[(expanded)]`. Ignored outside `treegrid` mode.
   */
  readonly expanded = model<readonly T[]>([]);

  protected readonly headerSize = injectElementSize(this.#registry.headerRowEl);

  readonly #roving = new RovingTabindex(() => this.#flatCells());
  readonly #enteredCell = signal<HTMLElement | null>(null);

  readonly #headerCellHosts = this.#registry.headerCells;
  readonly #dataCells = computed(() => this.#registry.rows().flatMap((row) => row.cells()));
  readonly #dataCols = computed(
    () =>
      this.#registry
        .rows()
        .find((row) => row.cells().length > 0)
        ?.cells().length ?? 0,
  );

  /**
   * Whether the registered header cells form a complete grid row that joins the body's
   * roving grid as its first row. True in `grid` / `treegrid` mode when at least one
   * header cell registered and the count matches the data column count (or there are no
   * data rows yet). Draggable header cells (a `[forTableColumnReorder]` row) register the
   * same way, so a column-reorderable grid still forms one composite tab stop across
   * header and body — the reorder wrapper hands its drop-list roving over to this grid via
   * `FOR_DROP_LIST_ROVING_DELEGATE` and routes idle header navigation through
   * `handleHeaderCellKeydown`.
   */
  readonly #headerParticipates = computed(() => {
    if (this.mode() === 'table') {
      return false;
    }
    const headerCount = this.#headerCellHosts().length;
    if (headerCount === 0) {
      return false;
    }
    const dataCols = this.#dataCols();
    return dataCols === 0 || headerCount === dataCols;
  });

  readonly headerParticipatesInRoving = this.#headerParticipates;

  /**
   * The composite roving grid: the header cells (as grid row 0, when they form a
   * complete row) followed by the data cells in row-major order, so the table exposes
   * a single tab stop and arrow navigation crosses between the header and the body.
   */
  readonly #flatCells = computed<readonly ForTableCellHandle[]>(() =>
    this.#headerParticipates()
      ? [...this.#headerCellHosts(), ...this.#dataCells()]
      : this.#dataCells(),
  );
  readonly #cols = computed(() => {
    const dataCols = this.#dataCols();
    return dataCols > 0 ? dataCols : this.#headerCellHosts().length;
  });
  readonly #firstEnabledCell = computed(() => firstEnabledHost(this.#flatCells()));

  /** Whether the header row participates in the row-index space (a header row is registered, non-table mode). */
  readonly #hasHeaderRowIndex = computed(
    () => this.mode() !== 'table' && this.#registry.headerRowEl() !== null,
  );

  /** 1-based row offset ARIA applies to data rows because the header row occupies index 1. */
  readonly dataRowIndexOffset = computed(() => (this.#hasHeaderRowIndex() ? 1 : 0));

  readonly headerRowIndex = computed<number | null>(() => (this.#hasHeaderRowIndex() ? 1 : null));

  readonly #registeredValues = computed<readonly T[]>(() =>
    this.#registry
      .rows()
      .map((row) => row.value() as T)
      .filter((v) => v !== undefined),
  );
  readonly #aggregateValues = computed<readonly T[]>(
    () => this.selectableValues() ?? this.#registeredValues(),
  );

  readonly #selection = new TableRowSelection<T>({
    selection: this.value,
    selectionMode: this.selectionMode,
    selectionBehavior: this.selectionBehavior,
    compareWith: this.compareWith,
    aggregateValues: this.#aggregateValues,
  });

  readonly selectAllState: Signal<TableSelectAllState> = this.#selection.selectAllState;

  readonly #expansion = new TableExpansion<T>({
    expanded: this.expanded,
    compareWith: this.compareWith,
  });

  readonly #rowHierarchy = computed(() =>
    computeFlatHierarchy(this.#registry.rows().map((row) => row.level())),
  );

  #rowOfCell(cellHost: HTMLElement): ForTableRowHandle | undefined {
    return this.#registry.rows().find((row) => row.cells().some((cell) => cell.host === cellHost));
  }

  /**
   * Absolute index of the row that owns the currently roving-focused cell, or `null`
   * when no cell is focused (or the focused row carries no `virtualIndex`). Used by
   * `[forTableVirtualized]` to keep the focused row mounted across recycling.
   */
  readonly focusedRowIndex = computed<number | null>(() => {
    const active = this.#roving.active();
    if (active === null) {
      return null;
    }
    return this.#rowOfCell(active)?.virtualIndex() ?? null;
  });

  protected readonly rowCountAttr = computed<number | null>(() =>
    this.mode() === 'table'
      ? null
      : (this.rowCount() ?? this.#registry.rows().length) + this.dataRowIndexOffset(),
  );
  protected readonly colCountAttr = computed<number | null>(() =>
    this.mode() === 'table' ? null : (this.colCount() ?? this.#cols()),
  );

  isRowExpanded(value: T): boolean {
    return this.#expansion.isExpanded(value);
  }

  toggleRowExpansion(value: T): void {
    this.#expansion.toggle(value);
  }

  rowPosinset(host: HTMLElement): number {
    const index = this.#registry.rowIndexOf(host);
    return index < 0 ? 1 : (this.#rowHierarchy()[index]?.posinset ?? 1);
  }

  rowSetsize(host: HTMLElement): number {
    const index = this.#registry.rowIndexOf(host);
    return index < 0 ? 1 : (this.#rowHierarchy()[index]?.setsize ?? 1);
  }

  rowIndexOf(host: HTMLElement): number {
    return this.#registry.rowIndexOf(host);
  }

  cellTabIndex(host: HTMLElement): 0 | -1 {
    if (this.#roving.hasActive()) {
      return this.#roving.tabindexFor(host);
    }
    return this.#firstEnabledCell() === host ? 0 : -1;
  }

  headerCellTabIndex(host: HTMLElement): 0 | -1 {
    if (!this.#headerParticipates()) {
      return -1;
    }
    return this.cellTabIndex(host);
  }

  headerCellIndexOf(host: HTMLElement): number {
    return this.#registry.headerCellIndexOf(host);
  }

  isCellHighlighted(host: HTMLElement): boolean {
    return this.#roving.active() === host;
  }

  activateCell(host: HTMLElement): void {
    if (this.mode() !== 'table') {
      this.#roving.setActive(host);
    }
  }

  isRowSelected(value: T): boolean {
    return this.#selection.isSelected(value);
  }

  toggleRowSelection(value: T): void {
    this.#selection.toggle(value);
  }

  selectRow(
    value: T,
    modifiers?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
  ): void {
    this.#selection.select(value, modifiers);
  }

  toggleSelectAll(): void {
    this.#selection.toggleSelectAll();
  }

  #rowValueOfCell(cellHost: HTMLElement): T | undefined {
    for (const row of this.#registry.rows()) {
      if (row.cells().some((cell) => cell.host === cellHost)) {
        return row.value() as T;
      }
    }
    return undefined;
  }

  handleCellKeydown(event: KeyboardEvent, host: HTMLElement): void {
    if (this.mode() === 'table') {
      return;
    }
    this.#registry.virtualRowNavigation()?.clearPending();
    if (this.#handleCellEntryKeydown(event, host)) {
      return;
    }
    if (event.target !== host) {
      return;
    }
    if (this.#handleSelectionKeydown(event, host)) {
      return;
    }
    if (this.#handleExpansionKeydown(event, host)) {
      return;
    }
    this.#handleGridNavigationKeydown(event, host);
  }

  /**
   * Resolves grid navigation for a header cell that yields its host interaction to a
   * co-located `[forDraggable]` (a `[forTableColumnReorder]` row). `[forTableColumnReorder]`
   * calls this from a capture-phase listener for idle (not-lifted) header cells, so Arrow /
   * Home / End / Page keys move roving focus across the composite header + body grid while
   * Space / Enter still fall through to the draggable's lift. Returns `true` when the key
   * resolved to a grid action (and was consumed), `false` otherwise. No-op (returns `false`)
   * outside `grid` / `treegrid` mode or when the header row does not join the composite grid.
   */
  handleHeaderCellKeydown(event: KeyboardEvent, host: HTMLElement): boolean {
    if (this.mode() === 'table' || !this.#headerParticipates()) {
      return false;
    }
    this.#registry.virtualRowNavigation()?.clearPending();
    return this.#handleGridNavigationKeydown(event, host);
  }

  /**
   * APG grid cell-entry mode: Enter or F2 on a focused cell moves focus into the
   * cell's first interactive widget; Escape returns focus to the owning cell.
   * Returns `true` when the event was consumed.
   *
   * A cell whose host carries an active sort affordance (`[forTableSortHeader]`
   * with `sortable`, marked by `data-sortable`) defers `Enter` to the sort
   * activation — `Enter` toggles the sort and focus stays on the cell — while
   * `F2` remains the cell-entry key, so a sortable + resizable header does not
   * both sort and drop focus onto the resize handle.
   */
  #handleCellEntryKeydown(event: KeyboardEvent, host: HTMLElement): boolean {
    if ((event.key === 'Enter' || event.key === 'F2') && event.target === host) {
      if (event.key === 'Enter' && hostHasSortActivation(host)) {
        return false;
      }
      const target = findFirstFocusable(host);
      if (!target) {
        return false;
      }
      event.preventDefault();
      this.#enteredCell.set(host);
      target.focus();
      return true;
    }
    if (event.key === 'Escape' && this.#enteredCell() === host && event.target !== host) {
      event.preventDefault();
      this.#enteredCell.set(null);
      host.focus();
      return true;
    }
    return false;
  }

  #handleSelectionKeydown(event: KeyboardEvent, host: HTMLElement): boolean {
    if (event.key !== ' ' || event.target !== host || this.selectionMode() === 'none') {
      return false;
    }
    const value = this.#rowValueOfCell(host);
    if (value === undefined) {
      return false;
    }
    event.preventDefault();
    this.#selection.toggle(value);
    return true;
  }

  #handleExpansionKeydown(event: KeyboardEvent, host: HTMLElement): boolean {
    if (this.mode() !== 'treegrid') {
      return false;
    }
    const intent = resolveTreegridExpandCollapse(event, this.dir());
    if (intent === null) {
      return false;
    }
    const row = this.#rowOfCell(host);
    if (!row?.expandable()) {
      return false;
    }
    const value = row.value() as T;
    const open = this.#expansion.isExpanded(value);
    if (intent === 'expand' && !open) {
      event.preventDefault();
      this.#expansion.setExpanded(value, true);
      return true;
    }
    if (intent === 'collapse' && open) {
      event.preventDefault();
      this.#expansion.setExpanded(value, false);
      return true;
    }
    return false;
  }

  #handleGridNavigationKeydown(event: KeyboardEvent, host: HTMLElement): boolean {
    const cols = this.#cols();
    const cells = this.#flatCells();
    if (cols === 0 || cells.length === 0) {
      return false;
    }
    const action: GridNavigationAction | null = resolveGridNavigation(event, {
      cols,
      dir: this.dir(),
      pageKeys: true,
    });
    if (action === null) {
      return false;
    }
    event.preventDefault();
    const currentIndex = cells.findIndex((cell) => cell.host === host);

    const navigation = this.#registry.virtualRowNavigation();
    const fromRow = this.focusedRowIndex();
    const total = this.rowCount();
    const headerIsGridStart = action === 'first' && this.#headerParticipates();
    if (headerIsGridStart) {
      navigation?.scrollToRow(0);
    }
    if (
      navigation !== null &&
      total !== undefined &&
      fromRow !== null &&
      ROW_CROSSING_ACTIONS.has(action) &&
      !headerIsGridStart
    ) {
      const col = currentIndex < 0 ? 0 : currentIndex % cols;
      const target = resolveCrossWindowRowTarget(
        action,
        fromRow,
        col,
        total,
        cols,
        this.#pageSize(),
      );
      if (target !== null) {
        navigation.navigateTo(target.row, target.col, target.direction);
      }
      return true;
    }

    const next = moveGridIndex(currentIndex < 0 ? 0 : currentIndex, cells.length, action, {
      cols,
      pageSize: this.#pageSize(),
      isDisabled: (i) => cells[i]!.disabled(),
    });
    if (next === null) {
      return true;
    }
    this.#roving.focusActive(cells[next]!.host);
    return true;
  }

  /**
   * Rows a PageUp / PageDown moves. One page is the number of rendered data rows
   * — in a virtualized grid that is the visible window (plus overscan), so paging
   * a 100k-row grid advances by a screenful rather than teleporting to an end. A
   * lone-row window still advances by at least one row.
   */
  #pageSize(): number {
    return Math.max(1, this.#registry.rows().length);
  }
}

/**
 * Resolves the absolute `(row, 0-based column)` target and travel `direction`
 * for a row-crossing grid action against the true `total` row count. Arrow
 * row-moves preserve the current column; `page-up` / `page-down` move by
 * `pageSize` rows (clamped to the dataset bounds) preserving the column;
 * `last` jumps to the last cell of the whole grid. The `direction` (`+1` for
 * down / first, `-1` for up / last) is threaded to the virtualization bridge so
 * it can step over full-span variant rows onto the adjacent data row. Returns
 * `null` when the move would not change the focused row. `first` is routed
 * through the non-virtualized `moveGridIndex` path (to the first header cell)
 * when the header participates in roving, so this resolver's `first` case
 * applies only to a header-less grid. That routing decides the focus *target*
 * only: `Ctrl+Home` still scrolls a virtualized window back to row 0 through
 * `scrollToRow(0)` before falling through, so the grid is never left focused on
 * its header while the window sits at the bottom of the dataset.
 */
function resolveCrossWindowRowTarget(
  action: GridNavigationAction,
  fromRow: number,
  col: number,
  total: number,
  cols: number,
  pageSize: number,
): { row: number; col: number; direction: 1 | -1 } | null {
  switch (action) {
    case 'next-row':
      return fromRow + 1 < total ? { row: fromRow + 1, col, direction: 1 } : null;
    case 'prev-row':
      return fromRow - 1 >= 0 ? { row: fromRow - 1, col, direction: -1 } : null;
    case 'page-down': {
      const row = Math.min(total - 1, fromRow + Math.max(1, pageSize));
      return row > fromRow ? { row, col, direction: 1 } : null;
    }
    case 'page-up': {
      const row = Math.max(0, fromRow - Math.max(1, pageSize));
      return row < fromRow ? { row, col, direction: -1 } : null;
    }
    case 'first':
      return { row: 0, col: 0, direction: 1 };
    case 'last':
      return { row: total - 1, col: cols - 1, direction: -1 };
    default:
      return null;
  }
}
