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
    <div role="rowgroup">
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
        @for (row of rows(); track trackRow(row, $index); let i = $index) {
          <div
            forTableRow
            [value]="valueFor(row, i)"
            [style.display]="'grid'"
            [style.grid-template-columns]="track()"
          >
            @for (col of orderedColumns(); track col.name()) {
              <div #cell="forTableCell" forTableCell [name]="col.name()" [sticky]="col.sticky()">
                <ng-container
                  [ngTemplateOutlet]="col.dataCell().template"
                  [ngTemplateOutletInjector]="cell.injector"
                  [ngTemplateOutletContext]="{ $implicit: row, index: i }"
                />
              </div>
            }
          </div>
        }
      }
    </div>
    <ng-content />
  `,
})
export class ForTableBody<T = unknown> {
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

  protected readonly placeholderRange = computed(() =>
    Array.from({ length: Math.max(0, this.placeholderRows()) }, (_, i) => i),
  );

  constructor() {
    injectTableContext('ForTableBody');
  }

  /** Resolves a `sortable` column's current direction from the single `sort` descriptor. */
  protected directionFor(column: string): TableSortDirection {
    const descriptor = this.sort();
    return descriptor && descriptor.column === column ? descriptor.direction : 'none';
  }

  /** Tracking identity for a row: the consumer's `rowKey`, else the index. */
  protected trackRow(row: T, index: number): unknown {
    return this.rowKey()?.(row, index) ?? index;
  }

  /** Selection identity for a row: the consumer's `rowKey`, else `undefined` (not selectable). */
  protected valueFor(row: T, index: number): unknown {
    return this.rowKey()?.(row, index);
  }
}
