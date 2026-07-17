import {
  booleanAttribute,
  contentChild,
  Directive,
  inject,
  input,
  TemplateRef,
} from '@angular/core';

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
 *
 * When the row type is a discriminated union, also bind `[forRowCellWhen]` to
 * the same type guard used on the def's `[when]` so `let-row` is narrowed to the
 * matched variant member (`V`) instead of staying the full union.
 */
@Directive({ selector: 'ng-template[forRowCell]' })
export class ForRowCell<T, V extends T = T> {
  /** The captured row-variant template, typed with `ForDataCellContext<T>`. */
  readonly template = inject<TemplateRef<ForDataCellContext<T>>>(TemplateRef);

  /**
   * Type-inference hint: bind to the same collection as `ForTableBody`'s `rows`
   * so `let-row` is typed as the row type. Read only by the compiler; the
   * directive never touches its value.
   */
  readonly rowType = input<readonly T[]>([], { alias: 'forRowCellRow' });

  /**
   * Type-inference hint: bind the same type guard used on this def's `[when]`
   * so `let-row` is narrowed to the matched variant member (`V`). Read only by
   * the compiler; the directive never touches its value. Omitting it leaves
   * `let-row` typed as the full `T`.
   */
  readonly narrowType = input<((row: T, index: number) => row is V) | null>(null, {
    alias: 'forRowCellWhen',
  });

  /** Narrows the template context type for `let-row` under strict template checking. */
  static ngTemplateContextGuard<T, V extends T>(
    _directive: ForRowCell<T, V>,
    _context: unknown,
  ): _context is ForDataCellContext<V> {
    return true;
  }
}

/**
 * Declarative definition of a row variant for `<for-table-body>`. Place
 * `[forRowDef]` on an `<ng-container>` alongside the `[forColumnDef]`s and bind a
 * `[when]` predicate; for every datum the predicate matches, `ForTableBody` renders
 * this variant instead of the per-column data cells. A def comes in one of two
 * shapes, and must declare **exactly one** of them:
 *
 * - **Full-span** (a `[forRowCell]` template): the matched row's single cell spans
 *   all columns and renders the template — group-header rows, section separators,
 *   full-width summary / empty-state rows. The spanning cell carries the row's
 *   `role` (`gridcell` in grid / treegrid mode) plus `aria-colindex="1"` and
 *   `aria-colspan` equal to the column count, but it does **not** join the roving 2D
 *   navigation grid (it registers no cell handle), so arrow-key navigation moves
 *   between the regular data cells and steps over the variant row.
 * - **Placeholder cells** (the `placeholderCells` flag, no `[forRowCell]`): the
 *   matched row stamps one cell per displayed column from each column's
 *   `[forPlaceholderCell]` template — interleaved / trailing skeleton rows for
 *   infinite-scroll or paginated tables. Unlike the full-span shape these keep the
 *   roving grid **rectangular** (one cell per column), and the cells are stamped
 *   disabled so grid-mode arrow navigation steps over them.
 *
 * Either way the variant row is **presentational** and **non-selectable** (its
 * `value` stays `undefined`), while still occupying a row slot and counting towards
 * `aria-rowindex` / `aria-rowcount` (reading order is preserved).
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
 *     <ng-template forPlaceholderCell><span class="skeleton"></span></ng-template>
 *   </ng-container>
 *
 *   <!-- full-span group header -->
 *   <ng-container forRowDef [when]="isGroupHeader">
 *     <ng-template forRowCell [forRowCellRow]="rows()" let-row>{{ row.group }}</ng-template>
 *   </ng-container>
 *
 *   <!-- per-column skeleton rows while the next page loads -->
 *   <ng-container forRowDef [when]="isPlaceholder" placeholderCells />
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

  /**
   * The variant's full-span content template. Present for a full-span def; absent
   * (and unused) when `placeholderCells` is set. A def must declare exactly one of
   * a `[forRowCell]` template or `placeholderCells` — the body validates this and
   * throws a `[forty-cdk/table]` error otherwise.
   */
  readonly cell = contentChild(ForRowCell);

  /**
   * Render this variant's matched rows as **per-column placeholder cells** instead
   * of a full-span `[forRowCell]`. Set it (the bare `placeholderCells` attribute)
   * for interleaved / trailing skeleton rows — infinite-scroll or paginated tables
   * that keep their loaded rows and append placeholder rows while the next page
   * loads. The body stamps one `[forTableCell]` per displayed column from that
   * column's `[forPlaceholderCell]` template (an empty cell when the column omits
   * it), exactly like the `loading` state, but stamps the cells disabled so
   * grid-mode arrow navigation steps over them and the roving grid stays
   * rectangular.
   *
   * A def must declare **exactly one** of a `[forRowCell]` template or
   * `placeholderCells`; declaring both or neither throws a `[forty-cdk/table]`
   * error.
   */
  readonly placeholderCells = input(false, { transform: booleanAttribute });
}
