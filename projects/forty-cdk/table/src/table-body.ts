import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  output,
  type Signal,
} from '@angular/core';

import { ForColumnDef } from './column-def';
import { ForRowDef } from './row-def';
import { ForTableCell } from './table-cell';
import { ForTableColumnResizer, type TableResizeDescriptor } from './table-column-resizer';
import { injectTableContext } from './table-context';
import { ForTableHeaderCell } from './table-header-cell';
import { ForTableHeaderRow } from './table-header-row';
import { ForTableRow } from './table-row';
import {
  ForTableSortHeader,
  type TableSortDescriptor,
  type TableSortDirection,
} from './table-sort-header';

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
 * Ergonomic declarative renderer for `[forTable]` in `<div role>` grid mode.
 * Place `<for-table-body>` inside a `[forTable]` element and declare one
 * `[forColumnDef]` per column; the body harvests the defs and stamps the header
 * row and one data row per item out of the raw cell primitives, so a column is
 * authored in a single block instead of being smeared across header, data, and
 * placeholder rows.
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
 * `resizable` flags and surfaced through `sortChange` / `resizeCommit`; the sort
 * and width descriptors stay consumer-applied (BYO-data). Selection stays
 * consumer-placed: drop `[forTableRowSelector]` / `[forTableSelectAll]` into the
 * cell templates and set `rowKey` so each row carries a selection identity.
 *
 * **Virtualization is transparent.** Adding `[forTableVirtualized]` to the same
 * `[forTable]` element switches the body to windowed rendering automatically:
 * it reads the published window off the table context (no cross-entry import),
 * renders only the visible slice indexed into `rows`, sizes its rowgroup to the
 * full scroll height, and absolutely positions each row at its offset. The
 * consumer passes the whole dataset to `rows` and sets `[rowCount]` on
 * `[forTable]` — no `#v` reference, manual sizer, `@for` window, or
 * `[virtualIndex]` binding. Fixed-size rows only for now (drive row height in
 * CSS); measured / dynamic row heights stay on the raw `[forTableRow]` path.
 *
 * **Row variants.** Declare one or more `[forRowDef]` alongside the columns to
 * render a full-span row for the data they match (group headers, section
 * separators, summary / empty-state rows). For each datum the body picks the
 * first `[forRowDef]` whose `[when]` predicate returns `true` and stamps a row
 * whose single cell spans every column and renders the `[forRowCell]` template;
 * unmatched data renders the standard per-column row. Variant rows are
 * presentational — their spanning cell stays out of the roving 2D navigation
 * grid (arrow keys step over them) and they are non-selectable — but they still
 * occupy a row slot and count towards `aria-rowindex` / `aria-rowcount`.
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
    ForTableSortHeader,
    ForTableColumnResizer,
  ],
  template: `
    <div forTableHeaderRow [style.display]="'grid'" [style.grid-template-columns]="track()">
      @for (col of orderedColumns(); track col.name()) {
        <div
          #headerCell="forTableHeaderCell"
          forTableHeaderCell
          [name]="col.name()"
          [sticky]="col.sticky()"
          forTableSortHeader
          [column]="col.name()"
          [sortable]="col.sortable()"
          [direction]="directionFor(col.name())"
          (sortChange)="sortChange.emit($event)"
        >
          <ng-container
            [ngTemplateOutlet]="col.header().template"
            [ngTemplateOutletInjector]="headerCell.injector"
          />
          @if (col.resizable()) {
            <button
              forTableColumnResizer
              autoFit
              [column]="col.name()"
              [attr.aria-label]="col.resizeAriaLabel()"
              (resizeCommit)="resizeCommit.emit($event)"
            ></button>
          }
        </div>
      }
    </div>
    <div
      role="rowgroup"
      [style.position]="sizerHeight() !== null ? 'relative' : null"
      [style.height.px]="sizerHeight()"
    >
      @if (loading()) {
        @for (placeholder of placeholderRange(); track placeholder) {
          <div forTableRow [style.display]="'grid'" [style.grid-template-columns]="track()">
            @for (col of orderedColumns(); track col.name()) {
              <div #cell="forTableCell" forTableCell [name]="col.name()" [sticky]="col.sticky()">
                @if (col.placeholderCell(); as placeholderCell) {
                  <ng-container
                    [ngTemplateOutlet]="placeholderCell.template"
                    [ngTemplateOutletInjector]="cell.injector"
                  />
                }
              </div>
            }
          </div>
        }
      } @else {
        @for (r of renderRows(); track r.key) {
          <div
            #rowRef="forTableRow"
            forTableRow
            [value]="r.value"
            [virtualIndex]="r.virtualIndex"
            [attr.data-index]="r.virtualIndex"
            [style.display]="'grid'"
            [style.grid-template-columns]="track()"
            [style.position]="r.start !== null ? 'absolute' : null"
            [style.left]="r.start !== null ? '0' : null"
            [style.right]="r.start !== null ? '0' : null"
            [style.transform]="r.start !== null ? 'translateY(' + r.start + 'px)' : null"
          >
            @if (r.variant; as variant) {
              <div
                [attr.role]="cellRole()"
                [attr.aria-colindex]="1"
                [attr.aria-colspan]="orderedColumns().length"
                [attr.data-row-variant]="''"
                [style.grid-column]="'1 / -1'"
              >
                <ng-container
                  [ngTemplateOutlet]="variant.cell().template"
                  [ngTemplateOutletInjector]="rowRef.injector"
                  [ngTemplateOutletContext]="{ $implicit: r.datum, index: r.index }"
                />
              </div>
            } @else {
              @for (col of orderedColumns(); track col.name()) {
                <div #cell="forTableCell" forTableCell [name]="col.name()" [sticky]="col.sticky()">
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

  /** When set, render `placeholderRows` skeleton rows (from `[forPlaceholderCell]`) instead of data. */
  readonly loading = input(false);

  /** Number of placeholder rows rendered while `loading`. Default `3`. */
  readonly placeholderRows = input(3);

  /** Fires when a `sortable` header is activated; forwarded from the internal `[forTableSortHeader]`. */
  readonly sortChange = output<TableSortDescriptor>();

  /** Fires when a `resizable` column commits a width; forwarded from the internal `[forTableColumnResizer]`. */
  readonly resizeCommit = output<TableResizeDescriptor>();

  /** Declared column definitions, in DOM order. */
  protected readonly columns = contentChildren(ForColumnDef);

  /** Declared full-span row variants, in DOM order (first match wins per datum). */
  protected readonly rowDefs = contentChildren(ForRowDef);

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
   * The derived `grid-template-columns` track, applied to the header row and every
   * data row and exposed for consumers who want to bind it elsewhere. Each column
   * contributes its `width`, or the published resize var with a `minmax(0, 1fr)` fallback.
   */
  readonly track: Signal<string> = computed(() =>
    this.orderedColumns()
      .map((col) => col.width() ?? `var(--for-table-col-${col.name()}-width, minmax(0, 1fr))`)
      .join(' '),
  );

  /**
   * The rows to render this change-detection pass. When `[forTableVirtualized]`
   * has published a window it maps the window's slice into `rows` (absolute
   * index + pixel offset per row); otherwise it maps every row in flow order.
   */
  protected readonly renderRows = computed<readonly RenderRow<T>[]>(() => {
    const window = this.#ctx.virtualWindow();
    const data = this.rows();
    const key = this.rowKey();
    const variants = this.rowDefs();
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

  /** Full scroll height (px) applied to the rowgroup when virtualized, else `null` (natural height). */
  protected readonly sizerHeight = computed<number | null>(() => {
    const window = this.#ctx.virtualWindow();
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
}
