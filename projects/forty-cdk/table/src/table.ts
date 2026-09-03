import {
  computed,
  Directive,
  inject,
  input,
  model,
  type Provider,
  type Signal,
  signal,
  type Type,
} from '@angular/core';

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

/**
 * The value [ARIA reserves](https://www.w3.org/TR/wai-aria-1.2/#aria-rowcount) on
 * `aria-rowcount` / `aria-colcount` for a total the author cannot determine. It is
 * what a `grid` / `treegrid` reports when the count is genuinely unknowable rather
 * than merely zero: a `0` there would state that a grid claiming rows has no columns
 * at all (or that a windowed grid has no rows), a contradiction a screen reader
 * cannot reconcile — and `0` is itself in range, so it reads as a real answer rather
 * than as a missing one.
 *
 * The two channels qualify "unknowable" differently, and the asymmetry is deliberate: the row
 * channel gates on the grid being windowed, because a non-windowed grid's rendered rows *are* all
 * its rows; the column channel does not, because zero registered cells is degenerate markup rather
 * than a resolvable state. See `colCount`.
 */
const UNKNOWN_COUNT = -1;

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
  providers: provideForTable(ForTable),
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
   * count plus the header offset — so an empty non-virtualized grid with a header
   * row reports `aria-rowcount="1"`, because its rendered rows are all the rows it
   * has. A **windowed** grid rendering no data row is the one shape whose total is
   * unknowable, and there `aria-rowcount` reports `-1`, the value ARIA reserves for
   * an unknown total. An explicit value is emitted verbatim, including `0`. Ignored
   * in `mode="table"`.
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
   * column count (the cells of the first data row that has any, else the registered
   * header cells) — and when no channel knows the count, `aria-colcount` reports
   * `-1`, the value ARIA reserves for an unknown total. That is the shape a
   * virtualized grid with no header row has until its first window resolves: no row
   * is rendered, so no cell has registered.
   *
   * Unlike `aria-rowcount`, that sentinel is **unconditional** — it is not gated on
   * the grid being windowed.
   * A non-windowed grid with no registered cell has rows without cells, or no markup
   * at all: degenerate either way, so there is no state where `0` is the resolved
   * answer rather than the missing one, and emitting it would re-open exactly the
   * "`0` reads as a real answer" defect the sentinel exists for.
   *
   * An explicit value is emitted verbatim, including `0`. Ignored in `mode="table"`.
   */
  readonly colCount = input<number>();

  /** Row selection mode. `'none'` (default) disables selection entirely. */
  readonly selectionMode = input<TableSelectionMode>('none');

  /**
   * How a row click changes the selection. `'toggle'` (default) flips the clicked
   * row. `'replace'` replaces the selection with the clicked row; Ctrl/Cmd-click
   * toggles a single row and Shift-click extends a range (multiple mode only).
   * `'none'` leaves the selection untouched on a row click, so the row click is
   * free for whole-row activation while `[forTableRowSelector]`,
   * `[forTableSelectAll]` and `Space` on a focused grid cell keep driving the
   * selection — `aria-selected` and `aria-multiselectable` are unaffected.
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

  private readonly headerParticipatesInRoving = this.#headerParticipates;

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

  private readonly columnCount = this.#cols;

  /**
   * The cell that owns the tab stop while nothing is roving-active — the first
   * enabled cell of the composite grid.
   *
   * It walks the header row and then the data rows one at a time instead of
   * reading the materialized `#flatCells`, so it stops depending on a row's
   * `cells()` as soon as an earlier row has answered. Every cell's `tabindex`
   * binding is a live consumer of this signal and each row registers its cells
   * during that row's own update pass, so a dependency on the whole grid would make each
   * registration notify every cell mounted so far, which is quadratic in grid size.
   *
   * The header branch's fall-through is unreachable: header cells hardcode a
   * `false` `disabled`, and `#headerParticipates()` already rules out an empty
   * header row. It is kept so the walk stays equivalent to the `#flatCells`
   * concatenation if header cells ever gain a real disabled state.
   */
  readonly #firstEnabledCell = computed<HTMLElement | null>(() => {
    if (this.#headerParticipates()) {
      const fromHeader = firstEnabledHost(this.#headerCellHosts());
      if (fromHeader !== null) {
        return fromHeader;
      }
    }
    for (const row of this.#registry.rows()) {
      const fromRow = firstEnabledHost(row.cells());
      if (fromRow !== null) {
        return fromRow;
      }
    }
    return null;
  });

  /** Whether the header row participates in the row-index space (a header row is registered, non-table mode). */
  readonly #hasHeaderRowIndex = computed(
    () => this.mode() !== 'table' && this.#registry.headerRowEl() !== null,
  );

  /** 1-based row offset ARIA applies to data rows because the header row occupies index 1. */
  private readonly dataRowIndexOffset = computed(() => (this.#hasHeaderRowIndex() ? 1 : 0));

  private readonly headerRowIndex = computed<number | null>(() =>
    this.#hasHeaderRowIndex() ? 1 : null,
  );

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

  /**
   * Whether the grid is windowed — a `[forTableVirtualized]` companion has published
   * a rendered window, so the registered rows are a slice of the dataset rather than
   * all of it. That companion registers the window from its **constructor**, so this
   * already answers `true` server-side and on the first frame, for the raw-primitive
   * path as much as for `<for-table-body>`; being a signal read inside a `computed`
   * also makes the two directives' construction order on the shared host irrelevant.
   */
  readonly #windowed = computed(() => this.#registry.virtualWindow() !== null);

  protected readonly rowCountAttr = computed<number | null>(() => {
    if (this.mode() === 'table') {
      return null;
    }
    const total = this.rowCount();
    if (total !== undefined) {
      return total + this.dataRowIndexOffset();
    }
    const rendered = this.#registry.rows().length;
    if (rendered === 0 && this.#windowed()) {
      return UNKNOWN_COUNT;
    }
    return rendered + this.dataRowIndexOffset();
  });
  protected readonly colCountAttr = computed<number | null>(() => {
    if (this.mode() === 'table') {
      return null;
    }
    const total = this.colCount();
    if (total !== undefined) {
      return total;
    }
    const rendered = this.#cols();
    return rendered === 0 ? UNKNOWN_COUNT : rendered;
  });

  isRowExpanded(value: T): boolean {
    return this.#expansion.isExpanded(value);
  }

  toggleRowExpansion(value: T): void {
    this.#expansion.toggle(value);
  }

  private rowPosinset(host: HTMLElement): number {
    const index = this.#registry.rowIndexOf(host);
    return index < 0 ? 1 : (this.#rowHierarchy()[index]?.posinset ?? 1);
  }

  private rowSetsize(host: HTMLElement): number {
    const index = this.#registry.rowIndexOf(host);
    return index < 0 ? 1 : (this.#rowHierarchy()[index]?.setsize ?? 1);
  }

  private rowIndexOf(host: HTMLElement): number {
    return this.#registry.rowIndexOf(host);
  }

  private cellTabIndex(host: HTMLElement): 0 | -1 {
    if (this.#roving.hasActive()) {
      return this.#roving.tabindexFor(host);
    }
    return this.#firstEnabledCell() === host ? 0 : -1;
  }

  private headerCellTabIndex(host: HTMLElement): 0 | -1 {
    if (!this.#headerParticipates()) {
      return -1;
    }
    return this.cellTabIndex(host);
  }

  private headerCellIndexOf(host: HTMLElement): number {
    return this.#registry.headerCellIndexOf(host);
  }

  private isCellHighlighted(host: HTMLElement): boolean {
    return this.#roving.active() === host;
  }

  private activateCell(host: HTMLElement): void {
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

  private handleCellKeydown(event: KeyboardEvent, host: HTMLElement): void {
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
  private handleHeaderCellKeydown(event: KeyboardEvent, host: HTMLElement): boolean {
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
    const currentIndex = Math.max(
      0,
      cells.findIndex((cell) => cell.host === host),
    );

    const navigation = this.#registry.virtualRowNavigation();
    const fromRow = this.focusedRowIndex();
    const total = this.rowCount();
    const pageSize = this.#pageSize();
    const headerIsRowTarget =
      this.#headerParticipates() && targetsHeaderRow(action, fromRow, pageSize);
    if (headerIsRowTarget) {
      navigation?.scrollToRow(0);
    }
    if (
      navigation !== null &&
      total !== undefined &&
      fromRow !== null &&
      ROW_CROSSING_ACTIONS.has(action) &&
      !headerIsRowTarget
    ) {
      const col = currentIndex % cols;
      const target = resolveCrossWindowRowTarget(action, fromRow, col, total, cols, pageSize);
      if (target !== null) {
        navigation.navigateTo(target.row, target.col, target.direction);
      }
      return true;
    }

    const next = moveGridIndex(currentIndex, cells.length, action, {
      cols,
      pageSize,
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
 * `pageSize` rows (the caller's `#pageSize()` is already at least 1, and the
 * move is clamped to the dataset bounds) preserving the column;
 * `last` jumps to the last cell of the whole grid. The `direction` (`+1` for
 * down / first, `-1` for up / last) is threaded to the virtualization bridge so
 * it can step over full-span variant rows onto the adjacent data row. Returns
 * `null` when the move would not change the focused row. The actions
 * {@link targetsHeaderRow} claims for a participating header row — `first`,
 * plus `prev-row` / `page-up` from within the first page of data rows — are
 * routed through the non-virtualized `moveGridIndex` path instead, so this
 * resolver's `first` case applies only to a header-less grid and its `prev-row`
 * / `page-up` cases clamp at data row 0 only when the header does not
 * participate.
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
      const row = Math.min(total - 1, fromRow + pageSize);
      return row > fromRow ? { row, col, direction: 1 } : null;
    }
    case 'page-up': {
      const row = Math.max(0, fromRow - pageSize);
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

/**
 * Whether a row-crossing action lands on the header row of the composite grid,
 * given the absolute data row the move starts from (`null` when the focused cell
 * is not in a data row — a header cell, typically). Only meaningful when the
 * header participates in roving, in which case it is the grid's row 0 and the
 * data rows start at grid row 1:
 *
 * - `first` (`Ctrl+Home`) targets the first cell of the grid, i.e. the header.
 * - `prev-row` (`ArrowUp`) from data row 0 steps above the data, into the header.
 * - `page-up` from within the first page of data rows (`fromRow < pageSize`)
 *   clamps to grid row 0, which is the header — mirroring `moveGridIndex`'s
 *   clamp exactly.
 *
 * A header target is rendered whether or not the virtual window contains data
 * row 0, so `[forTable]` resolves these through the non-virtualized
 * `moveGridIndex` path rather than through the cross-window bridge; the caller
 * still asks the virtualizer to scroll back to row 0 first, so the grid is never
 * left focused on its header while the window sits at the bottom of the dataset.
 */
function targetsHeaderRow(
  action: GridNavigationAction,
  fromRow: number | null,
  pageSize: number,
): boolean {
  if (action === 'first') {
    return true;
  }
  if (fromRow === null) {
    return false;
  }
  if (action === 'prev-row') {
    return fromRow === 0;
  }
  return action === 'page-up' && fromRow < pageSize;
}

/**
 * The providers a `[forTable]` root installs: the public
 * {@link FOR_TABLE_CONTEXT}, aliased to `root`, plus the internal
 * piece-registration wiring the table's pieces resolve.
 *
 * `ForTable` declares its own providers through this helper, so a wrapper that
 * **subclasses** the root has a single call to keep in step with it. That
 * matters because Angular does not inherit a directive's `providers`: a subclass
 * carrying its own `@Directive` metadata replaces the array wholesale, so
 * re-providing `FOR_TABLE_CONTEXT` alone leaves the registration wiring absent
 * and every piece — down to the root's own constructor — fails to resolve it.
 * The internal providers are unnameable outside the library, which is why the
 * wrapper cannot list them by hand.
 *
 * ```ts
 * providers: provideForTable(MyTable),
 * ```
 *
 * Wrapping through `hostDirectives: [ForTable]` needs none of this — a host
 * directive brings its own providers to the element.
 */
export function provideForTable<T = unknown>(root: Type<ForTable<T>>): Provider[] {
  return [
    TableRegistry,
    { provide: FOR_TABLE_CONTEXT, useExisting: root },
    { provide: TABLE_REGISTRATION_CONTEXT, useExisting: TableRegistry },
  ];
}
