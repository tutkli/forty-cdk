import { NgTemplateOutlet } from '@angular/common';
import {
  afterEveryRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  model,
  output,
  type Signal,
  type TemplateRef,
  viewChildren,
} from '@angular/core';

import { ForDraggable, ForDragPlaceholder } from 'forty-cdk/drag-drop';

import { ForColumnDef, ForColumnDragPlaceholder, ForPlaceholderCellDefault } from './column-def';
import { eventFromInteractiveDescendant } from './interactive-descendant';
import { ForRowDef } from './row-def';
import { ForTableCell } from './table-cell';
import { ForTableColumnReorder, type TableColumnReorderDescriptor } from './table-column-reorder';
import { ForTableColumnResizer, type TableResizeDescriptor } from './table-column-resizer';
import { injectTableContext, injectTableRegistration } from './table-context';
import { ForTableHeaderCell } from './table-header-cell';
import { ForTableHeaderRow } from './table-header-row';
import { ForTableRow } from './table-row';
import { ForTableRowAttrs } from './table-row-attrs';
import {
  ForTableSortHeader,
  type TableSortDescriptor,
  type TableSortDirection,
} from './table-sort-header';

/**
 * Payload emitted by {@link ForTableBody.rowActivate} when a data row is
 * activated by a pointer click or the `Enter` key (whole-row navigation lists).
 */
export interface TableRowActivateEvent<T> {
  /** The activated row's datum. */
  readonly row: T;
  /** The activated row's 0-based dataset index (absolute when virtualized). */
  readonly index: number;
  /** The originating DOM event — a `MouseEvent` for a click, a `KeyboardEvent` for `Enter`. */
  readonly event: Event;
}

/**
 * Payload emitted by {@link ForTableBody.rowContextMenu} when a data row receives
 * a `contextmenu` event (right-click or the context-menu key).
 */
export interface TableRowContextMenuEvent<T> {
  /** The row's datum. */
  readonly row: T;
  /** The row's 0-based dataset index (absolute when virtualized). */
  readonly index: number;
  /** The originating `contextmenu` event; call `preventDefault()` to suppress the native menu. */
  readonly event: MouseEvent;
}

/** One row `<for-table-body>` renders, resolved from the static or virtualized path. */
interface RenderRow<T> {
  /** The row datum, passed to the data-cell template as `$implicit`. */
  readonly datum: T;
  /** Dataset index exposed to the data-cell template as `index` (absolute when virtualized). */
  readonly index: number;
  /** Absolute dataset index when virtualized (drives `[virtualIndex]`), else `null`. */
  readonly virtualIndex: number | null;
  /** Pixel offset for `translateY` when virtualized, else `null` (static flow layout). */
  readonly start: number | null;
  /** Selection identity from `rowKey`, or `undefined` when the row is not selectable (or a variant). */
  readonly value: unknown;
  /** `@for` tracking key: the selection identity, falling back to the dataset index. */
  readonly key: unknown;
  /** The matched full-span row variant, or `null` for a standard per-column row. */
  readonly variant: ForRowDef<unknown> | null;
}

/**
 * Ergonomic declarative renderer for the columns of a `[forTable]`.
 * Place `<for-table-body>` inside a `[forTable]` element and declare one
 * `[forColumnDef]` per column; the body harvests the defs and stamps the header
 * row and one data row per item out of the raw cell primitives, so a column is
 * authored in a single block instead of being smeared across header, data, and
 * placeholder rows.
 *
 * **Supported modes: `table` and `grid`.** Nothing in the body is grid-specific
 * — it derives each stamped cell's role from the table `mode` (`cell` in
 * `table`, `gridcell` in `grid`) and applies no mode guard. Choose `mode="grid"`
 * for interactive cells (roving 2D navigation, cell widgets, cell-entry); choose
 * the default `mode="table"` for read-only or whole-row navigation lists, where
 * `role="grid"` would announce an interaction model the list does not have. The
 * table-mode row-interaction companion feature (whole-row activate / context
 * menu) is tracked in
 * [#1349](https://github.com/tutkli/forty-cdk/issues/1349). `mode="treegrid"` is
 * out of scope — the body stamps no expansion affordances.
 *
 * It owns only the grid **structure** — it applies `display: grid` and the
 * derived `grid-template-columns` track (from each def's `width` and the
 * published `--for-table-col-<name>-width` resize var) to the header row and
 * every data row. All visual styling (colours, borders, padding, sticky offsets)
 * stays the consumer's, off the `data-*` / role hooks the raw primitives emit.
 *
 * The host is `display: contents` so it never introduces a box between
 * `[forTable]` and its rows. Consumers who want full DOM control keep using the
 * raw `[forTableCell]` / `[forTableHeaderCell]` primitives directly.
 *
 * Sort and resize affordances are auto-wired from the per-column `sortable` /
 * `resizable` flags. Sort stays consumer-applied (BYO-data): the body derives each
 * header's `aria-sort` from `sort` and re-emits activation through `sortChange`.
 * Resize width state can be owned by the body instead — `[(columnWidths)]` seeds
 * each `resizable` handle's width (keyed by column name) and tracks its live
 * changes, so the resized track drives itself with no per-consumer plumbing; each
 * `resizable` column is tuned per def via `resizeMin` / `resizeMax` / `resizeStep`
 * / `autoFit` / `fitIncludesHeader`, and gesture-end commits still surface through
 * `resizeCommit`. Selection stays consumer-placed: drop `[forTableRowSelector]` /
 * `[forTableSelectAll]` into the cell templates and set `rowKey` so each row
 * carries a selection identity.
 *
 * **Virtualization is transparent.** Adding `[forTableVirtualized]` to the same
 * `[forTable]` element switches the body to windowed rendering automatically:
 * it reads the published window off the table context (no cross-entry import),
 * renders only the visible slice indexed into `rows`, sizes its rowgroup to the
 * full scroll height, and absolutely positions each row at its offset. The
 * consumer passes the whole dataset to `rows` — the body derives the true total
 * from its length, so `[rowCount]` on `[forTable]` is unnecessary (bind it only
 * for a server-known total larger than the loaded rows). No `#v` reference,
 * manual sizer, `@for` window, or `[virtualIndex]` binding. Rows are fixed-size
 * by default (drive row height in CSS); set `measureRows` for measured /
 * variable row heights (denser variant rows, group separators) — the body feeds
 * each rendered row's real height back to the virtualizer so the window stays
 * aligned after scroll.
 *
 * **Row variants.** Declare one or more `[forRowDef]` alongside the columns to
 * render a variant row for the data they match. For each datum the body picks the
 * first `[forRowDef]` whose `[when]` predicate returns `true`; unmatched data
 * renders the standard per-column row. Each def declares one of two shapes: a
 * `[forRowCell]` template stamps a **full-span** row (group headers, section
 * separators, summary / empty-state rows) whose single cell spans every column;
 * the `placeholderCells` flag stamps **per-column placeholder cells** (interleaved
 * / trailing skeleton rows for infinite scroll) from each column's
 * `[forPlaceholderCell]`, falling back to the body-level
 * `[forPlaceholderCellDefault]` for a column that declares none. Either way
 * variant rows are presentational and non-selectable, and still count towards
 * `aria-rowindex` / `aria-rowcount`. A
 * full-span cell stays out of the roving 2D navigation grid (registers no cell
 * handle, so arrow keys step over the row); placeholder cells keep the grid
 * rectangular (one cell per column) but are stamped disabled so grid navigation
 * steps over them.
 */
@Component({
  selector: 'for-table-body',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  imports: [
    NgTemplateOutlet,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableCell,
    ForTableRow,
    ForTableRowAttrs,
    ForTableSortHeader,
    ForTableColumnResizer,
    ForTableColumnReorder,
    ForDraggable,
    ForDragPlaceholder,
  ],
  template: `
    <ng-template #headerCellContent let-col let-cell="cell">
      <ng-container
        [ngTemplateOutlet]="col.header().template"
        [ngTemplateOutletInjector]="cell.injector"
      />
      @if (col.resizable()) {
        <button
          forTableColumnResizer
          [column]="col.name()"
          [width]="columnWidths()[col.name()]"
          [min]="col.resizeMin()"
          [max]="col.resizeMax()"
          [step]="col.resizeStep()"
          [autoFit]="col.autoFit()"
          [fitIncludesHeader]="col.fitIncludesHeader()"
          [widthRevert]="onColumnWidthRevert"
          [attr.aria-label]="col.resizeAriaLabel()"
          (widthChange)="onColumnWidthChange(col.name(), $event)"
          (resizeCommit)="resizeCommit.emit($event)"
        ></button>
      }
    </ng-template>

    @if (hasReorderable()) {
      <div
        forTableHeaderRow
        forTableColumnReorder
        [style.display]="'grid'"
        [style.grid-template-columns]="track()"
        (columnReorder)="columnReorder.emit($event)"
      >
        @for (col of orderedColumns(); track col.name()) {
          @if (col.reorderable()) {
            <div
              #headerCell="forTableHeaderCell"
              forTableHeaderCell
              [name]="col.name()"
              [sticky]="col.sticky()"
              [class]="col.headerClass()"
              forTableSortHeader
              [column]="col.name()"
              [sortable]="col.sortable()"
              [direction]="directionFor(col.name())"
              (sortChange)="sortChange.emit($event)"
              forDraggable
              [dragData]="col.name()"
            >
              <ng-container
                [ngTemplateOutlet]="headerCellContent"
                [ngTemplateOutletInjector]="headerCell.injector"
                [ngTemplateOutletContext]="{ $implicit: col, cell: headerCell }"
              />
              @if (columnDragPlaceholder(); as placeholder) {
                <ng-template forDragPlaceholder>
                  <ng-container [ngTemplateOutlet]="placeholder.template" />
                </ng-template>
              }
            </div>
          } @else {
            <div
              #headerCell="forTableHeaderCell"
              forTableHeaderCell
              [name]="col.name()"
              [sticky]="col.sticky()"
              [class]="col.headerClass()"
              forTableSortHeader
              [column]="col.name()"
              [sortable]="col.sortable()"
              [direction]="directionFor(col.name())"
              (sortChange)="sortChange.emit($event)"
            >
              <ng-container
                [ngTemplateOutlet]="headerCellContent"
                [ngTemplateOutletInjector]="headerCell.injector"
                [ngTemplateOutletContext]="{ $implicit: col, cell: headerCell }"
              />
            </div>
          }
        }
      </div>
    } @else {
      <div forTableHeaderRow [style.display]="'grid'" [style.grid-template-columns]="track()">
        @for (col of orderedColumns(); track col.name()) {
          <div
            #headerCell="forTableHeaderCell"
            forTableHeaderCell
            [name]="col.name()"
            [sticky]="col.sticky()"
            [class]="col.headerClass()"
            forTableSortHeader
            [column]="col.name()"
            [sortable]="col.sortable()"
            [direction]="directionFor(col.name())"
            (sortChange)="sortChange.emit($event)"
          >
            <ng-container
              [ngTemplateOutlet]="headerCellContent"
              [ngTemplateOutletInjector]="headerCell.injector"
              [ngTemplateOutletContext]="{ $implicit: col, cell: headerCell }"
            />
          </div>
        }
      </div>
    }
    <div
      role="rowgroup"
      [style.position]="sizerHeight() !== null ? 'relative' : null"
      [style.height.px]="sizerHeight()"
    >
      @if (loading()) {
        @for (placeholder of placeholderRange(); track placeholder) {
          <div forTableRow [style.display]="'grid'" [style.grid-template-columns]="track()">
            @for (col of orderedColumns(); track col.name()) {
              <div
                #cell="forTableCell"
                forTableCell
                disabled
                [name]="col.name()"
                [sticky]="col.sticky()"
                [class]="col.cellClass()"
              >
                <ng-container
                  [ngTemplateOutlet]="placeholderTemplateFor(col)"
                  [ngTemplateOutletInjector]="cell.injector"
                />
              </div>
            }
          </div>
        }
      } @else {
        @for (r of renderRows(); track r.key) {
          <div
            #rowRef="forTableRow"
            #rowEl
            forTableRow
            [value]="r.value"
            [virtualIndex]="r.virtualIndex"
            [attr.data-index]="r.virtualIndex"
            [attr.tabindex]="rowTabIndex(r)"
            [class]="rowClassFor(r)"
            [forTableRowAttrs]="rowAttrsFor(r)"
            [style.display]="'grid'"
            [style.grid-template-columns]="track()"
            [style.position]="r.start !== null ? 'absolute' : null"
            [style.left]="r.start !== null ? '0' : null"
            [style.right]="r.start !== null ? '0' : null"
            [style.transform]="r.start !== null ? 'translateY(' + r.start + 'px)' : null"
            (click)="onRowClick(r, $event)"
            (keydown.enter)="onRowEnter(r, $event)"
            (contextmenu)="onRowContextMenu(r, $event)"
          >
            @if (r.variant; as variant) {
              @if (variant.placeholderCells()) {
                @for (col of orderedColumns(); track col.name()) {
                  <div
                    #cell="forTableCell"
                    forTableCell
                    disabled
                    [name]="col.name()"
                    [sticky]="col.sticky()"
                    [class]="col.cellClass()"
                  >
                    <ng-container
                      [ngTemplateOutlet]="placeholderTemplateFor(col)"
                      [ngTemplateOutletInjector]="cell.injector"
                    />
                  </div>
                }
              } @else {
                <div
                  [attr.role]="cellRole()"
                  [attr.aria-colindex]="1"
                  [attr.aria-colspan]="orderedColumns().length"
                  [attr.data-row-variant]="''"
                  [style.grid-column]="'1 / -1'"
                >
                  <ng-container
                    [ngTemplateOutlet]="variant.cell()?.template ?? null"
                    [ngTemplateOutletInjector]="rowRef.injector"
                    [ngTemplateOutletContext]="{ $implicit: r.datum, index: r.index }"
                  />
                </div>
              }
            } @else {
              @for (col of orderedColumns(); track col.name()) {
                <div
                  #cell="forTableCell"
                  forTableCell
                  [name]="col.name()"
                  [sticky]="col.sticky()"
                  [class]="col.cellClass()"
                >
                  <ng-container
                    [ngTemplateOutlet]="col.dataCell().template"
                    [ngTemplateOutletInjector]="cell.injector"
                    [ngTemplateOutletContext]="{ $implicit: r.datum, index: r.index }"
                  />
                </div>
              }
            }
          </div>
        }
      }
    </div>
    <ng-content />
  `,
})
export class ForTableBody<T = unknown> {
  readonly #ctx = injectTableContext('ForTableBody');
  readonly #registration = injectTableRegistration('ForTableBody');

  private readonly rowEls = viewChildren<ElementRef<HTMLElement>>('rowEl');
  readonly #measuredAt = new WeakMap<HTMLElement, string>();

  constructor() {
    const bodyRowCount = computed(() =>
      this.loading() ? Math.max(0, this.placeholderRows()) : this.rows().length,
    );
    this.#registration.registerBodyRowCount(bodyRowCount);
    inject(DestroyRef).onDestroy(() => this.#registration.registerBodyRowCount(null));

    afterEveryRender(() => {
      const window = this.#registration.virtualWindow();
      if (!window || !this.measureRows()) {
        return;
      }
      for (const ref of this.rowEls()) {
        const el = ref.nativeElement;
        const index = el.getAttribute('data-index');
        if (index === null || this.#measuredAt.get(el) === index) {
          continue;
        }
        this.#measuredAt.set(el, index);
        window.measureRow(el);
      }
      window.measureRow(null);
    });
  }

  /** The rows to render — already sorted / filtered / paged by the consumer (BYO-data). */
  readonly rows = input.required<readonly T[]>();

  /**
   * Row identity used both for `@for` tracking and each row's selection `[value]`.
   * Omit it for non-selectable, index-tracked tables.
   */
  readonly rowKey = input<(row: T, index: number) => unknown>();

  /**
   * Which columns render, in order. Defaults to every declared `[forColumnDef]`
   * in DOM order. Names not matching a declared column are skipped.
   */
  readonly displayedColumns = input<readonly string[] | null>(null);

  /**
   * The single active sort descriptor. Each `sortable` column derives its
   * `aria-sort` from it (the "one sorted column" rule); the consumer updates it
   * from `sortChange` and re-sorts `rows`.
   */
  readonly sort = input<TableSortDescriptor | null>(null);

  /**
   * When set, render `placeholderRows` skeleton rows instead of data. Each cell
   * stamps the column's own `[forPlaceholderCell]`, else the body-level
   * `[forPlaceholderCellDefault]`, else nothing.
   */
  readonly loading = input(false);

  /** Number of placeholder rows rendered while `loading`. Default `3`. */
  readonly placeholderRows = input(3);

  /**
   * Opt in to **measured (variable) row heights** under `[forTableVirtualized]`.
   * When set, the body measures each stamped row after render and feeds its real
   * height back to the virtualizer, which replaces the `estimateRowSize` estimate
   * and re-aligns the offsets of the rows below — so a window mixing row shapes
   * (denser variant rows, group separators) stays contiguous after scroll.
   *
   * Off by default: a uniform-height table keeps the pure `estimateRowSize` fast
   * path with no per-row measurement work. Has no effect without
   * `[forTableVirtualized]` (there is no window to measure against).
   *
   * Measurement is not one-shot. The body's per-render measure is throttled per
   * `data-index`, so it covers only a row's initial post-render measurement and any
   * row recycled to a new index. Subsequent size changes of the **same mounted row**
   * (async content, image load, cell reflow) are re-measured automatically by the
   * virtualizer's own `ResizeObserver` — which re-aligns the offsets of the rows below
   * without any consumer action — so a row whose content loads asynchronously needs no
   * manual re-measure trigger.
   */
  readonly measureRows = input(false, { transform: booleanAttribute });

  /** Fires when a `sortable` header is activated; forwarded from the internal `[forTableSortHeader]`. */
  readonly sortChange = output<TableSortDescriptor>();

  /** Fires when a `resizable` column commits a width; forwarded from the internal `[forTableColumnResizer]`. */
  readonly resizeCommit = output<TableResizeDescriptor>();

  /**
   * Fires once per committed column reorder gesture (pointer drop or keyboard drop),
   * forwarded unchanged from the internal `[forTableColumnReorder]`. Its `from` / `to`
   * are indices into the **full displayed column order** (counting non-reorderable
   * columns), so a table with fixed columns applies `moveItemInArray(displayedColumns,
   * from, to)` over the whole `displayedColumns` array. Its `columns` lists the
   * reorderable columns in their new order (equal to the full displayed order only when
   * every displayed column is `reorderable`) — setting `displayedColumns` directly to
   * `columns` is valid only in that all-reorderable case, otherwise the fixed columns
   * are dropped. Only present when at least one `[forColumnDef]` is `reorderable`.
   */
  readonly columnReorder = output<TableColumnReorderDescriptor>();

  /**
   * Two-way map of column widths (px), keyed by column `name`. It seeds each
   * `resizable` column's stamped handle `[width]` — so the `role="separator"`
   * handle exposes `aria-valuenow` from the first render and the column's grid
   * track picks up the seeded width immediately — and is updated immutably on
   * every live width change the handle reports (pointer drag, keyboard resize,
   * auto-fit), including the pre-drag revert of a handle destroyed mid-drag. Only
   * `resizable` columns participate; other names are ignored.
   *
   * The map is JSON-serializable, so persisting a user's column layout is
   * `[(columnWidths)]` plus one storage write. Together with `[displayedColumns]`
   * and `[sort]` it makes the full user-configurable table state three bindings.
   * Its implicit `columnWidthsChange` fires only on handle-driven updates, not on
   * consumer writes through `[(columnWidths)]`.
   */
  readonly columnWidths = model<Readonly<Record<string, number>>>({});

  /**
   * Opt-in whole-row interaction for **navigation lists**, active only in the
   * default `mode="table"`. When set, each data row becomes a focusable tab stop
   * (`tabindex="0"`) and a pointer click or `Enter` emits `rowActivate`, while a
   * `contextmenu` (right-click or the context-menu key) emits `rowContextMenu`.
   * Full-span `[forRowDef]` variant rows stay non-interactive. Ignored in `grid`
   * / `treegrid` mode, where roving 2D navigation and cell-entry own the keyboard
   * and whole-row activation would conflict.
   *
   * Interactive content inside a data cell owns its own events: a click or
   * `Enter` originating from a `button`, `a[href]`, `input`, `select`,
   * `textarea`, `summary`, `label`, `audio`/`video[controls]`, an editable
   * `contenteditable` region, or an element carrying an interactive ARIA `role`
   * descendant does **not** emit `rowActivate`, and its native default action is
   * left intact — a trailing per-row action button keeps working, and `Enter` on
   * it is not `preventDefault`ed. The row still activates from anywhere else: cell text,
   * the gaps between cells, or the focused row host itself. `rowContextMenu` is
   * deliberately unguarded — a right-click anywhere on the row, including over an
   * inner control, still offers the row's context menu, matching native lists.
   */
  readonly interactiveRows = input(false, { transform: booleanAttribute });

  /**
   * Fires when a data row is activated by a pointer click or `Enter`, carrying
   * the row datum, its dataset index, and the originating event. Requires
   * `interactiveRows` and `mode="table"`.
   */
  readonly rowActivate = output<TableRowActivateEvent<T>>();

  /**
   * Fires when a data row receives a `contextmenu` event (right-click or the
   * context-menu key), carrying the row datum, its dataset index, and the event —
   * position your own overlay from it. Requires `interactiveRows` and
   * `mode="table"`.
   */
  readonly rowContextMenu = output<TableRowContextMenuEvent<T>>();

  /**
   * Per-row class hook, applied to data **and** variant rows in **every** mode.
   * Receives the row datum and its 0-based dataset index and returns the class(es)
   * to apply — a string, a `{ className: boolean }` map, or `undefined` for none.
   * This is the only seam for styling a body-owned row from its datum (an
   * "active" / "menu-open" highlight, error or dimmed rows). Evaluated on every
   * change-detection pass, so keep it cheap and free of side effects.
   */
  readonly rowClass =
    input<(row: T, index: number) => string | Record<string, boolean> | undefined>();

  /**
   * Per-row attribute hook, applied to data **and** variant rows in **every**
   * mode. Receives the row datum and its 0-based dataset index and returns an
   * attribute map to reflect on the row host; a key mapped to `null` (or dropped
   * from a later map) removes that attribute. Evaluated on every change-detection
   * pass, so keep it cheap and free of side effects.
   */
  readonly rowAttrs = input<(row: T, index: number) => Record<string, string | null> | undefined>();

  /** Declared column definitions, in DOM order. */
  protected readonly columns = contentChildren(ForColumnDef);

  /** Declared full-span row variants, in DOM order (first match wins per datum). */
  protected readonly rowDefs = contentChildren(ForRowDef);

  /** The optional shared drag placeholder for reorderable columns, or `undefined`. */
  protected readonly columnDragPlaceholder = contentChild(ForColumnDragPlaceholder);

  /** The optional body-level default placeholder-cell template, or `undefined`. */
  protected readonly placeholderCellDefault = contentChild(ForPlaceholderCellDefault);

  /**
   * Resolves the placeholder template a column stamps into its cell, in both
   * stamping paths: the column's own `[forPlaceholderCell]`, else the body-level
   * `[forPlaceholderCellDefault]`, else `null` for an empty cell.
   */
  protected placeholderTemplateFor(col: ForColumnDef): TemplateRef<unknown> | null {
    return col.placeholderCell()?.template ?? this.placeholderCellDefault()?.template ?? null;
  }

  /** The role a stamped cell carries: `'cell'` in `table` mode, `'gridcell'` otherwise. */
  protected readonly cellRole = computed(() =>
    this.#ctx.mode() === 'table' ? 'cell' : 'gridcell',
  );

  /** The columns to render, resolved from `displayedColumns` (or all defs, in order). */
  protected readonly orderedColumns = computed<readonly ForColumnDef[]>(() => {
    const defs = this.columns();
    const order = this.displayedColumns();
    if (!order) {
      return defs;
    }
    const byName = new Map(defs.map((def) => [def.name(), def]));
    return order.map((name) => byName.get(name)).filter((def): def is ForColumnDef => def != null);
  });

  /**
   * `true` when at least one displayed column is `reorderable`, switching the stamped
   * header row to the drag-reorder path (`[forTableColumnReorder]` + per-cell
   * `[forDraggable]`). A body with no reorderable column keeps the plain header row.
   */
  protected readonly hasReorderable = computed(() =>
    this.orderedColumns().some((col) => col.reorderable()),
  );

  /**
   * The derived `grid-template-columns` track, applied to the header row and every
   * data row and exposed for consumers who want to bind it elsewhere. Each column
   * contributes its `width`, or the published resize var falling back to the column's
   * `fallbackWidth` (`minmax(0, 1fr)` when that is unset too).
   */
  readonly track: Signal<string> = computed(() =>
    this.orderedColumns()
      .map(
        (col) =>
          col.width() ??
          `var(--for-table-col-${col.name()}-width, ${col.fallbackWidth() ?? 'minmax(0, 1fr)'})`,
      )
      .join(' '),
  );

  /**
   * The rows to render this change-detection pass. When `[forTableVirtualized]`
   * has published a window it maps the window's slice into `rows` (absolute
   * index + pixel offset per row); otherwise it maps every row in flow order.
   */
  protected readonly renderRows = computed<readonly RenderRow<T>[]>(() => {
    const window = this.#registration.virtualWindow();
    const data = this.rows();
    const key = this.rowKey();
    const variants = this.rowDefs();
    for (const def of variants) {
      this.#assertRowDefConfig(def);
    }
    const matchVariant = (datum: T, index: number): ForRowDef<unknown> | null =>
      variants.find((def) => def.when()(datum, index)) ?? null;
    if (window) {
      const out: RenderRow<T>[] = [];
      for (const vrow of window.rows()) {
        const datum = data[vrow.index];
        if (datum === undefined) {
          continue;
        }
        const identity = key?.(datum, vrow.index);
        const variant = matchVariant(datum, vrow.index);
        out.push({
          datum,
          index: vrow.index,
          virtualIndex: vrow.index,
          start: vrow.start,
          value: variant ? undefined : identity,
          key: identity ?? vrow.index,
          variant,
        });
      }
      return out;
    }
    return data.map((datum, i) => {
      const identity = key?.(datum, i);
      const variant = matchVariant(datum, i);
      return {
        datum,
        index: i,
        virtualIndex: null,
        start: null,
        value: variant ? undefined : identity,
        key: identity ?? i,
        variant,
      };
    });
  });

  /** Enforces that each `[forRowDef]` declares exactly one of `[forRowCell]` / `placeholderCells`. */
  #assertRowDefConfig(def: ForRowDef<unknown>): void {
    const hasCell = def.cell() != null;
    const hasPlaceholder = def.placeholderCells();
    if (hasCell === hasPlaceholder) {
      throw new Error(
        `[forty-cdk/table] A [forRowDef] must declare exactly one of a [forRowCell] template or the placeholderCells flag (this def declares ${hasCell ? 'both' : 'neither'}).`,
      );
    }
  }

  /** Full scroll height (px) applied to the rowgroup when virtualized, else `null` (natural height). */
  protected readonly sizerHeight = computed<number | null>(() => {
    const window = this.#registration.virtualWindow();
    return window && !this.loading() ? window.totalSize() : null;
  });

  protected readonly placeholderRange = computed(() =>
    Array.from({ length: Math.max(0, this.placeholderRows()) }, (_, i) => i),
  );

  /** Resolves a `sortable` column's current direction from the single `sort` descriptor. */
  protected directionFor(column: string): TableSortDirection {
    const descriptor = this.sort();
    return descriptor && descriptor.column === column ? descriptor.direction : 'none';
  }

  /** Whether whole-row interaction is active: opted in via `interactiveRows` and in `table` mode. */
  protected readonly rowsInteractive = computed(
    () => this.interactiveRows() && this.#ctx.mode() === 'table',
  );

  /** The `tabindex` for a stamped row: `0` for an interactive data row, `null` otherwise. */
  protected rowTabIndex(row: RenderRow<T>): 0 | null {
    return this.rowsInteractive() && !row.variant ? 0 : null;
  }

  /** Resolves the `rowClass` hook for a stamped row, or `undefined` when unset. */
  protected rowClassFor(row: RenderRow<T>): string | Record<string, boolean> | undefined {
    return this.rowClass()?.(row.datum, row.index);
  }

  /** Resolves the `rowAttrs` hook for a stamped row, or `undefined` when unset. */
  protected rowAttrsFor(row: RenderRow<T>): Record<string, string | null> | undefined {
    return this.rowAttrs()?.(row.datum, row.index);
  }

  /**
   * Folds a stamped resizer's live width update into the `[(columnWidths)]` map
   * immutably, keyed by the column name. Ignores the resizer's initial unset
   * (`undefined`) emission and no-ops when the width is unchanged, so seeding the
   * handle from `columnWidths` never loops back into a redundant model write.
   */
  protected onColumnWidthChange(column: string, width: number | undefined): void {
    if (width === undefined) {
      return;
    }
    const current = this.columnWidths();
    if (current[column] === width) {
      return;
    }
    this.columnWidths.set({ ...current, [column]: width });
  }

  /**
   * Folds a stamped resizer's teardown revert into `[(columnWidths)]`. A handle
   * destroyed mid-drag (its column dropped from `displayedColumns`, or `resizable`
   * toggled off) can no longer report through `widthChange`, so without this the map
   * would keep the transient drag width. Bound as a function reference because the
   * revert happens during the handle's teardown; the body itself outlives it, so its
   * own `columnWidthsChange` still reaches the consumer.
   */
  protected readonly onColumnWidthRevert = (descriptor: TableResizeDescriptor): void => {
    this.onColumnWidthChange(descriptor.column, descriptor.width);
  };

  protected onRowClick(row: RenderRow<T>, event: MouseEvent): void {
    this.#activateRow(row, event);
  }

  protected onRowEnter(row: RenderRow<T>, event: Event): void {
    if (this.#activateRow(row, event)) {
      event.preventDefault();
    }
  }

  protected onRowContextMenu(row: RenderRow<T>, event: MouseEvent): void {
    if (!this.rowsInteractive() || row.variant) {
      return;
    }
    this.rowContextMenu.emit({ row: row.datum, index: row.index, event });
  }

  #activateRow(row: RenderRow<T>, event: Event): boolean {
    if (!this.rowsInteractive() || row.variant || eventFromInteractiveDescendant(event)) {
      return false;
    }
    this.rowActivate.emit({ row: row.datum, index: row.index, event });
    return true;
  }
}
