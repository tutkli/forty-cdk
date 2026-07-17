import { contentChild, Directive, inject, input, TemplateRef } from '@angular/core';

import { type ForDataCellContext } from './column-def';

/**
 * Marks the content template of a full-span row variant. Place on an
 * `<ng-template forRowCell>` inside a `[forRowDef]`; its content is stamped into
 * a single cell that spans every column of the matched row, with the row datum
 * and its index exposed through `ForDataCellContext`.
 *
 * The spanning cell is presentational, so its template must **not** contain
 * interactive content (buttons, links, form controls) — the variant row stays
 * out of the grid's single-tab-stop roving order, so nested tabbables become
 * unreachable — nor a `[forTableCell]`, which would register a cell handle on
 * the variant row and make the roving grid ragged.
 *
 * Bind `[forRowCellRow]` to the same array passed to `ForTableBody`'s `rows` to
 * type `let-row` — the input is read only for type inference, never at runtime.
 */
@Directive({ selector: 'ng-template[forRowCell]' })
export class ForRowCell<T> {
  /** The captured row-variant template, typed with `ForDataCellContext<T>`. */
  readonly template = inject<TemplateRef<ForDataCellContext<T>>>(TemplateRef);

  /**
   * Type-inference hint: bind to the same collection as `ForTableBody`'s `rows`
   * so `let-row` is typed as the row type. Read only by the compiler; the
   * directive never touches its value.
   */
  readonly rowType = input<readonly T[]>([], { alias: 'forRowCellRow' });

  /** Narrows the template context type for `let-row` under strict template checking. */
  static ngTemplateContextGuard<T>(
    _directive: ForRowCell<T>,
    _context: unknown,
  ): _context is ForDataCellContext<T> {
    return true;
  }
}

/**
 * Declarative definition of a full-span row variant for `<for-table-body>`. Place
 * `[forRowDef]` on an `<ng-container>` alongside the `[forColumnDef]`s and bind a
 * `[when]` predicate; for every datum the predicate matches, `ForTableBody` stamps
 * a row whose single cell spans all columns and renders the `[forRowCell]` template
 * instead of the per-column data cells. This covers group-header rows, section
 * separators, and full-width summary / empty-state rows.
 *
 * The variant row is **presentational**: its spanning cell carries the row's
 * `role` (`gridcell` in grid / treegrid mode) plus `aria-colindex="1"` and
 * `aria-colspan` equal to the column count, but it does not join the roving 2D
 * navigation grid, so arrow-key navigation moves between the regular data cells
 * and steps over variant rows (their `aria-rowindex` still counts them in reading
 * order). Variant rows are also non-selectable.
 *
 * When several `[forRowDef]`s match a datum, the first in DOM order wins. A datum
 * matched by no `[forRowDef]` renders the standard per-column row.
 *
 * @example
 * ```html
 * <for-table-body [rows]="rows()">
 *   <ng-container forColumnDef="name">
 *     <ng-template forHeaderCell>Name</ng-template>
 *     <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
 *   </ng-container>
 *
 *   <ng-container forRowDef [when]="isGroupHeader">
 *     <ng-template forRowCell [forRowCellRow]="rows()" let-row>{{ row.group }}</ng-template>
 *   </ng-container>
 * </for-table-body>
 * ```
 */
@Directive({ selector: '[forRowDef]' })
export class ForRowDef<T> {
  /**
   * Predicate selecting which data rows render this variant instead of the
   * per-column row. Receives the datum and its 0-based dataset index and returns
   * `true` to render the variant. In a non-virtualized table the index equals
   * the row's rendered position; under `[forTableVirtualized]` it is the
   * **absolute** index into the full dataset. Evaluated for every datum on each
   * change-detection pass, so keep it cheap and free of side effects.
   */
  readonly when = input.required<(row: T, index: number) => boolean>();

  /** The variant's full-span content template. */
  readonly cell = contentChild.required(ForRowCell);
}
