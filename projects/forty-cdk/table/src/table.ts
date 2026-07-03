import {
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  type Signal,
  signal,
} from '@angular/core';

import {
  injectElementSize,
  Collection,
  firstEnabledHost,
  type GridNavigationAction,
  moveGridIndex,
  resolveGridNavigation,
  resolveTreegridExpandCollapse,
  type WritingDirection,
  computeFlatHierarchy,
  injectTextDirection,
  reconcileRovingActive,
  RovingTabindex,
} from 'forty-cdk/core';
import {
  FOR_TABLE_CONTEXT,
  type ForTableCellHandle,
  type ForTableContext,
  type ForTableRowHandle,
  type TableMode,
  type TableSelectionMode,
  type TableSelectionBehavior,
  type TableSelectAllState,
  type TableVirtualRowNavigation,
} from './table-context';
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
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.dir]': 'dir()',
    '[attr.data-mode]': 'mode()',
    '[style.--for-table-header-height.px]': 'headerSize()?.height ?? null',
    '[attr.aria-rowcount]': 'rowCountAttr()',
    '[attr.aria-colcount]': 'colCountAttr()',
    '[attr.aria-multiselectable]': 'selectionMode() === "multiple" ? "true" : null',
  },
  providers: [{ provide: FOR_TABLE_CONTEXT, useExisting: ForTable }],
})
export class ForTable implements ForTableContext {
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

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * True total number of data rows for `aria-rowcount`, e.g. for a server-paged or
   * (later) virtualized table that renders only a window of rows. Defaults to the
   * rendered data-row count. Ignored in `mode="table"`.
   */
  readonly rowCount = input<number>();

  /**
   * True total number of columns for `aria-colcount`. Defaults to the rendered
   * column count (the cells of the first data row). Ignored in `mode="table"`.
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
   * 0–1 entries. The implicit `selectionChange` fires only on internal mutations
   * (selector / row click / Space / select-all), never on consumer writes.
   */
  readonly selection = model<readonly unknown[]>([]);

  /** Equality comparator for row values. Defaults to `===`; supply id-based for objects. */
  readonly compareWith = input<(a: unknown, b: unknown) => boolean>((a, b) => a === b);

  /**
   * Full ordered set of selectable row values (each row's `[value]`), for a
   * virtualized or server-paged table whose aggregate selection operations must
   * span rows beyond the rendered window. When `null` (default), the select-all
   * tri-state, `toggleSelectAll`, and Shift-click range selection compute against
   * the registered (rendered) rows only. When supplied, they use this set as the
   * universe of selectable values, so a range can span unmounted rows and the
   * tri-state reflects the true dataset. Per-row selection is unaffected.
   */
  readonly selectableValues = input<readonly unknown[] | null>(null);

  /**
   * Two-way bindable open parent-row values (each row's `[value]`), for
   * `mode="treegrid"`. The implicit `expandedChange` fires only on internal
   * expand/collapse (ArrowRight/ArrowLeft, `toggleRowExpansion`), never on
   * consumer writes through `[(expanded)]`. Ignored outside `treegrid` mode.
   */
  readonly expanded = model<readonly unknown[]>([]);

  readonly #rootEl = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly #headerRowEl = signal<HTMLElement | null>(null);

  protected readonly headerSize = injectElementSize(this.#headerRowEl);

  readonly #rows = new Collection<ForTableRowHandle>();
  readonly #headerCells = new Collection<ForTableCellHandle>();
  readonly #roving = new RovingTabindex();
  readonly #enteredCell = signal<HTMLElement | null>(null);

  /** Live registered data rows, exposed to `[forTableVirtualized]`'s cross-window navigation bridge. */
  readonly rows = this.#rows.items;
  readonly #virtualNav = signal<TableVirtualRowNavigation | null>(null);
  readonly #reorderingRow = signal<number | null>(null);

  /**
   * Absolute index of the row currently being pointer-reordered, or `null`. Set by
   * `[forTableRowReorder]` and read by `[forTableVirtualized]` to keep the lifted
   * row mounted across recycling during a drag.
   */
  readonly reorderingRowIndex = this.#reorderingRow.asReadonly();
  readonly virtualRowNavigation = this.#virtualNav.asReadonly();

  readonly #headerCellHosts = computed(() => this.#headerCells.items());
  readonly #dataCells = computed(() => this.#rows.items().flatMap((row) => row.cells()));
  readonly #dataCols = computed(() => this.#rows.items()[0]?.cells().length ?? 0);

  /**
   * Whether the registered header cells form a complete grid row that can join the
   * body's roving grid. True when at least one header cell registered and the count
   * matches the data column count (or there are no data rows yet). When header cells
   * yield their tab stop to a co-located `[forDraggable]`, they do not register, so a
   * partially-draggable header row is excluded — the header's own reorder roving owns
   * it — keeping the composite grid's row-major geometry correct.
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
    () => this.mode() !== 'table' && this.#headerRowEl() !== null,
  );

  /** 1-based row offset ARIA applies to data rows because the header row occupies index 1. */
  readonly dataRowIndexOffset = computed(() => (this.#hasHeaderRowIndex() ? 1 : 0));

  readonly headerRowIndex = computed<number | null>(() => (this.#hasHeaderRowIndex() ? 1 : null));

  readonly #registeredValues = computed<readonly unknown[]>(() =>
    this.#rows
      .items()
      .map((row) => row.value())
      .filter((v) => v !== undefined),
  );
  readonly #aggregateValues = computed<readonly unknown[]>(
    () => this.selectableValues() ?? this.#registeredValues(),
  );

  readonly #selection = new TableRowSelection({
    selection: this.selection,
    selectionMode: this.selectionMode,
    selectionBehavior: this.selectionBehavior,
    compareWith: this.compareWith,
    aggregateValues: this.#aggregateValues,
  });

  readonly selectAllState: Signal<TableSelectAllState> = this.#selection.selectAllState;

  readonly #expansion = new TableExpansion({
    expanded: this.expanded,
    compareWith: this.compareWith,
  });

  readonly #rowHierarchy = computed(() =>
    computeFlatHierarchy(this.#rows.items().map((row) => row.level())),
  );

  #rowOfCell(cellHost: HTMLElement): ForTableRowHandle | undefined {
    return this.#rows.items().find((row) => row.cells().some((cell) => cell.host === cellHost));
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
      : (this.rowCount() ?? this.#rows.items().length) + this.dataRowIndexOffset(),
  );
  protected readonly colCountAttr = computed<number | null>(() =>
    this.mode() === 'table' ? null : (this.colCount() ?? this.#cols()),
  );

  constructor() {
    reconcileRovingActive(this.#roving, this.#flatCells);
  }

  registerHeaderRow(el: HTMLElement): void {
    this.#headerRowEl.set(el);
  }

  setColumnWidth(column: string, width: number): void {
    this.#rootEl.style.setProperty(`--for-table-col-${column}-width`, `${width}px`);
  }

  isRowExpanded(value: unknown): boolean {
    return this.#expansion.isExpanded(value);
  }

  toggleRowExpansion(value: unknown): void {
    this.#expansion.toggle(value);
  }

  rowPosinset(host: HTMLElement): number {
    const index = this.#rows.indexOfHost(host);
    return index < 0 ? 1 : (this.#rowHierarchy()[index]?.posinset ?? 1);
  }

  rowSetsize(host: HTMLElement): number {
    const index = this.#rows.indexOfHost(host);
    return index < 0 ? 1 : (this.#rowHierarchy()[index]?.setsize ?? 1);
  }

  unregisterHeaderRow(el: HTMLElement): void {
    if (this.#headerRowEl() === el) {
      this.#headerRowEl.set(null);
    }
  }

  registerVirtualNavigation(navigation: TableVirtualRowNavigation | null): void {
    this.#virtualNav.set(navigation);
  }

  setReorderingRow(index: number | null): void {
    this.#reorderingRow.set(index);
  }

  registerRow(handle: ForTableRowHandle): void {
    this.#rows.register(handle);
  }

  unregisterRow(handle: ForTableRowHandle): void {
    this.#rows.unregister(handle);
  }

  rowIndexOf(host: HTMLElement): number {
    return this.#rows.indexOfHost(host);
  }

  cellTabIndex(host: HTMLElement): 0 | -1 {
    if (this.#roving.hasActive()) {
      return this.#roving.tabindexFor(host);
    }
    return this.#firstEnabledCell() === host ? 0 : -1;
  }

  registerHeaderCell(handle: ForTableCellHandle): void {
    this.#headerCells.register(handle);
  }

  unregisterHeaderCell(handle: ForTableCellHandle): void {
    this.#headerCells.unregister(handle);
  }

  headerCellTabIndex(host: HTMLElement): 0 | -1 {
    if (!this.#headerParticipates()) {
      return -1;
    }
    return this.cellTabIndex(host);
  }

  headerCellIndexOf(host: HTMLElement): number {
    return this.#headerCells.indexOfHost(host);
  }

  isCellHighlighted(host: HTMLElement): boolean {
    return this.#roving.active() === host;
  }

  activateCell(host: HTMLElement): void {
    if (this.mode() !== 'table') {
      this.#roving.setActive(host);
    }
  }

  isRowSelected(value: unknown): boolean {
    return this.#selection.isSelected(value);
  }

  toggleRowSelection(value: unknown): void {
    this.#selection.toggle(value);
  }

  selectRow(
    value: unknown,
    modifiers?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
  ): void {
    this.#selection.select(value, modifiers);
  }

  toggleSelectAll(): void {
    this.#selection.toggleSelectAll();
  }

  #rowValueOfCell(cellHost: HTMLElement): unknown {
    for (const row of this.#rows.items()) {
      if (row.cells().some((cell) => cell.host === cellHost)) {
        return row.value();
      }
    }
    return undefined;
  }

  handleCellKeydown(event: KeyboardEvent, host: HTMLElement): void {
    if (this.mode() === 'table') {
      return;
    }
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
   * APG grid cell-entry mode: Enter or F2 on a focused cell moves focus into the
   * cell's first interactive widget; Escape returns focus to the owning cell.
   * Returns `true` when the event was consumed.
   */
  #handleCellEntryKeydown(event: KeyboardEvent, host: HTMLElement): boolean {
    if ((event.key === 'Enter' || event.key === 'F2') && event.target === host) {
      const target = firstFocusableInCell(host);
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
    const value = row.value();
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

  #handleGridNavigationKeydown(event: KeyboardEvent, host: HTMLElement): void {
    const cols = this.#cols();
    const cells = this.#flatCells();
    if (cols === 0 || cells.length === 0) {
      return;
    }
    const action: GridNavigationAction | null = resolveGridNavigation(event, {
      cols,
      dir: this.dir(),
      pageKeys: true,
    });
    if (action === null) {
      return;
    }
    event.preventDefault();
    const currentIndex = cells.findIndex((cell) => cell.host === host);

    const navigation = this.#virtualNav();
    const fromRow = this.focusedRowIndex();
    const total = this.rowCount();
    if (
      navigation !== null &&
      total !== undefined &&
      fromRow !== null &&
      ROW_CROSSING_ACTIONS.has(action)
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
        navigation.navigateTo(target.row, target.col);
      }
      return;
    }

    const next = moveGridIndex(currentIndex < 0 ? 0 : currentIndex, cells.length, action, {
      cols,
      pageSize: this.#pageSize(),
      isDisabled: (i) => cells[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    this.#roving.focusActive(cells[next]!.host);
  }

  /**
   * Rows a PageUp / PageDown moves. One page is the number of rendered data rows
   * — in a virtualized grid that is the visible window (plus overscan), so paging
   * a 100k-row grid advances by a screenful rather than teleporting to an end. A
   * lone-row window still advances by at least one row.
   */
  #pageSize(): number {
    return Math.max(1, this.#rows.items().length);
  }
}

/** Finds the first tabbable descendant of a grid cell for APG Enter / F2 cell entry. */
function firstFocusableInCell(cell: HTMLElement): HTMLElement | null {
  const candidates = cell.querySelectorAll<HTMLElement>(CELL_FOCUSABLE_SELECTOR);
  for (const candidate of candidates) {
    if (candidate === cell || candidate.hasAttribute('hidden')) {
      continue;
    }
    return candidate;
  }
  return null;
}

const CELL_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Resolves the absolute `(row, 0-based column)` target for a row-crossing grid
 * action against the true `total` row count. Arrow row-moves preserve the
 * current column; `page-up` / `page-down` move by `pageSize` rows (clamped to
 * the dataset bounds) preserving the column; `first` / `last` jump to the first
 * / last cell of the whole grid. Returns `null` when the move would not change
 * the focused row.
 */
function resolveCrossWindowRowTarget(
  action: GridNavigationAction,
  fromRow: number,
  col: number,
  total: number,
  cols: number,
  pageSize: number,
): { row: number; col: number } | null {
  switch (action) {
    case 'next-row':
      return fromRow + 1 < total ? { row: fromRow + 1, col } : null;
    case 'prev-row':
      return fromRow - 1 >= 0 ? { row: fromRow - 1, col } : null;
    case 'page-down': {
      const row = Math.min(total - 1, fromRow + Math.max(1, pageSize));
      return row > fromRow ? { row, col } : null;
    }
    case 'page-up': {
      const row = Math.max(0, fromRow - Math.max(1, pageSize));
      return row < fromRow ? { row, col } : null;
    }
    case 'first':
      return { row: 0, col: 0 };
    case 'last':
      return { row: total - 1, col: cols - 1 };
    default:
      return null;
  }
}
