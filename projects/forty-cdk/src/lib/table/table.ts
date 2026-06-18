import { computed, Directive, ElementRef, inject, input, model, signal } from '@angular/core';

import { SelectionModel } from '../_internal/selection-model/selection-model';
import { injectElementSize } from '../_internal/element-size/element-size';
import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type GridNavigationAction,
  moveGridIndex,
  resolveGridNavigation,
  resolveTreegridExpandCollapse,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { computeFlatHierarchy } from '../_internal/flat-hierarchy/flat-hierarchy';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { reconcileRovingActive } from '../_internal/roving-tabindex/reconcile-roving-active';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import {
  FOR_TABLE_CONTEXT,
  type ForTableContext,
  type ForTableRowHandle,
  type TableMode,
  type TableSelectionMode,
  type TableSelectionBehavior,
  type TableSelectAllState,
} from './table-context';

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
  readonly #roving = new RovingTabindex();

  readonly #flatCells = computed(() => this.#rows.items().flatMap((row) => row.cells()));
  readonly #cols = computed(() => this.#rows.items()[0]?.cells().length ?? 0);
  readonly #firstEnabledCell = computed(() => firstEnabledHost(this.#flatCells()));

  readonly #selection = new SelectionModel<unknown>(this.selection, {
    multiple: computed(() => this.selectionMode() === 'multiple'),
    compareWith: (a, b) => this.compareWith()(a, b),
  });
  readonly #anchorValue = signal<unknown>(undefined);
  readonly #selectableValues = computed<readonly unknown[]>(() =>
    this.#rows
      .items()
      .map((row) => row.value())
      .filter((v) => v !== undefined),
  );
  readonly selectAllState = computed<TableSelectAllState>(() => {
    const values = this.#selectableValues();
    if (values.length === 0) {
      return 'none';
    }
    let count = 0;
    for (const v of values) {
      if (this.#selection.isSelected(v)) {
        count += 1;
      }
    }
    if (count === 0) {
      return 'none';
    }
    return count === values.length ? 'all' : 'some';
  });

  readonly #rowHierarchy = computed(() =>
    computeFlatHierarchy(this.#rows.items().map((row) => row.level())),
  );

  #isExpanded(value: unknown): boolean {
    return this.expanded().some((v) => this.compareWith()(v, value));
  }

  #setExpanded(value: unknown, open: boolean): void {
    if (value === undefined) {
      return;
    }
    const current = this.expanded();
    const has = this.#isExpanded(value);
    if (open && !has) {
      this.expanded.set([...current, value]);
    } else if (!open && has) {
      this.expanded.set(current.filter((v) => !this.compareWith()(v, value)));
    }
  }

  #rowOfCell(cellHost: HTMLElement): ForTableRowHandle | undefined {
    return this.#rows.items().find((row) => row.cells().some((cell) => cell.host === cellHost));
  }

  protected readonly rowCountAttr = computed<number | null>(() =>
    this.mode() === 'table' ? null : (this.rowCount() ?? this.#rows.items().length),
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
    return this.#isExpanded(value);
  }

  toggleRowExpansion(value: unknown): void {
    if (value === undefined) {
      return;
    }
    this.#setExpanded(value, !this.#isExpanded(value));
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
    if (this.selectionMode() === 'none') {
      return;
    }
    this.#selection.toggle(value);
    this.#anchorValue.set(value);
  }

  selectRow(
    value: unknown,
    modifiers?: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
  ): void {
    const mode = this.selectionMode();
    if (mode === 'none') {
      return;
    }
    if (this.selectionBehavior() === 'toggle') {
      this.#selection.toggle(value);
      this.#anchorValue.set(value);
      return;
    }
    const multiple = mode === 'multiple';
    if (multiple && modifiers?.shiftKey) {
      this.#selectRange(value);
      return;
    }
    if (multiple && (modifiers?.ctrlKey || modifiers?.metaKey)) {
      this.#selection.toggle(value);
      this.#anchorValue.set(value);
      return;
    }
    this.#selection.setSelection(value);
    this.#anchorValue.set(value);
  }

  toggleSelectAll(): void {
    if (this.selectionMode() !== 'multiple') {
      return;
    }
    if (this.selectAllState() === 'all') {
      this.#selection.clear();
    } else {
      this.#selection.select(...this.#selectableValues());
    }
  }

  #selectRange(toValue: unknown): void {
    const values = this.#selectableValues();
    const equals = this.compareWith();
    const toIdx = values.findIndex((v) => equals(v, toValue));
    if (toIdx < 0) {
      return;
    }
    const anchor = this.#anchorValue();
    const anchorIdx = anchor === undefined ? -1 : values.findIndex((v) => equals(v, anchor));
    const start = anchorIdx < 0 ? toIdx : anchorIdx;
    const [lo, hi] = start <= toIdx ? [start, toIdx] : [toIdx, start];
    this.#selection.setSelection(...values.slice(lo, hi + 1));
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
    if (event.key === ' ' && event.target === host && this.selectionMode() !== 'none') {
      const value = this.#rowValueOfCell(host);
      if (value !== undefined) {
        event.preventDefault();
        this.#selection.toggle(value);
        this.#anchorValue.set(value);
        return;
      }
    }
    if (this.mode() === 'treegrid') {
      const intent = resolveTreegridExpandCollapse(event, this.dir());
      if (intent !== null) {
        const row = this.#rowOfCell(host);
        if (row?.expandable()) {
          const value = row.value();
          const open = this.#isExpanded(value);
          if (intent === 'expand' && !open) {
            event.preventDefault();
            this.#setExpanded(value, true);
            return;
          }
          if (intent === 'collapse' && open) {
            event.preventDefault();
            this.#setExpanded(value, false);
            return;
          }
        }
      }
    }
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
    const next = moveGridIndex(currentIndex < 0 ? 0 : currentIndex, cells.length, action, {
      cols,
      isDisabled: (i) => cells[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    this.#roving.focusActive(cells[next]!.host);
  }
}
