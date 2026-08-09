import {
  booleanAttribute,
  contentChild,
  Directive,
  inject,
  input,
  TemplateRef,
} from '@angular/core';

import { assertInputBound, unsetInput } from 'forty-cdk/core';

import { type ForTableCellDefContext } from './column-def';
import { registerTableRowDef } from './def-registry';

/**
 * Marks the content template of a full-span row variant. Place on an
 * `<ng-template forTableRowCellDef>` inside a `[forTableRowDef]`; its content is
 * stamped into a single cell that spans every column of the matched row, with the
 * row datum and its index exposed through `ForTableCellDefContext`.
 *
 * The spanning cell is presentational, so its template must **not** contain
 * interactive content (buttons, links, form controls) — the variant row stays
 * out of the grid's single-tab-stop roving order, so nested tabbables become
 * unreachable — nor a `[forTableCell]`, which would register a cell handle on
 * the variant row and make the roving grid ragged.
 *
 * Bind `[forTableRowCellDefRow]` to the same array passed to `ForTableBody`'s
 * `rows` to type `let-row` — the input is read only for type inference, never at
 * runtime.
 *
 * When the row type is a discriminated union, also bind `[forTableRowCellDefWhen]`
 * to the same type guard used on the def's `[when]` so `let-row` is narrowed to
 * the matched variant member (`V`) instead of staying the full union.
 */
@Directive({ selector: 'ng-template[forTableRowCellDef]' })
export class ForTableRowCellDef<T, V extends T = T> {
  /** The captured row-variant template, typed with `ForTableCellDefContext<T>`. */
  readonly template = inject<TemplateRef<ForTableCellDefContext<T>>>(TemplateRef);

  /**
   * Type-inference hint: bind to the same collection as `ForTableBody`'s `rows`
   * so `let-row` is typed as the row type. Read only by the compiler; the
   * directive never touches its value.
   */
  readonly rowType = input<readonly T[]>([], { alias: 'forTableRowCellDefRow' });

  /**
   * Type-inference hint: bind the same type guard used on this def's `[when]`
   * so `let-row` is narrowed to the matched variant member (`V`). Read only by
   * the compiler; the directive never touches its value. Omitting it leaves
   * `let-row` typed as the full `T`.
   */
  readonly narrowType = input<((row: T, index: number) => row is V) | null>(null, {
    alias: 'forTableRowCellDefWhen',
  });

  /** Narrows the template context type for `let-row` under strict template checking. */
  static ngTemplateContextGuard<T, V extends T>(
    _directive: ForTableRowCellDef<T, V>,
    _context: unknown,
  ): _context is ForTableCellDefContext<V> {
    return true;
  }
}

/**
 * Declarative definition of a row variant for `<for-table-body>`. Place
 * `[forTableRowDef]` on an `<ng-container>` alongside the `[forTableColumnDef]`s and
 * bind a `[when]` predicate; for every datum the predicate matches, `ForTableBody`
 * renders this variant instead of the per-column data cells. A def comes in one of
 * two shapes, and must declare **exactly one** of them:
 *
 * - **Full-span** (a `[forTableRowCellDef]` template): the row's single cell spans every
 *   column — group headers, section separators, summary or empty-state rows. It carries
 *   the row's `role` plus `aria-colindex="1"` and an `aria-colspan` equal to the column
 *   count, but registers no cell handle, so roving arrow navigation steps over the row.
 * - **Placeholder cells** (the `placeholderCells` flag, no `[forTableRowCellDef]`): the row
 *   stamps one cell per displayed column from each column's `[forTablePlaceholderCellDef]`
 *   — skeleton rows for infinite-scroll or paginated tables. These keep the roving grid
 *   rectangular, and are stamped disabled so arrow navigation steps over them.
 *
 * Either way the variant row is presentational and non-selectable — its `value` stays `undefined` —
 * while still occupying a row slot and counting towards `aria-rowindex` / `aria-rowcount`.
 *
 * When several defs match a datum the first in DOM order wins; a datum matched by none renders the
 * standard per-column row.
 *
 * Like `[forTableColumnDef]`, the def registers itself with the surrounding body through DI at
 * construction, so a preset component may declare it in its own view and a scaffold wrapper may
 * project it into a body it owns — see {@link ForTableDefRegistry}. A def with no reachable
 * registry throws.
 *
 * @example
 * ```html
 * <for-table-body [rows]="rows()">
 *   <ng-container forTableColumnDef="name">
 *     <ng-template forTableHeaderCellDef>Name</ng-template>
 *     <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{ row.name }}</ng-template>
 *     <ng-template forTablePlaceholderCellDef><span class="skeleton"></span></ng-template>
 *   </ng-container>
 *
 *   <!-- full-span group header -->
 *   <ng-container forTableRowDef [when]="isGroupHeader">
 *     <ng-template forTableRowCellDef [forTableRowCellDefRow]="rows()" let-row>{{ row.group }}</ng-template>
 *   </ng-container>
 *
 *   <!-- per-column skeleton rows while the next page loads -->
 *   <ng-container forTableRowDef [when]="isPlaceholder" placeholderCells />
 * </for-table-body>
 * ```
 */
@Directive({ selector: '[forTableRowDef]' })
export class ForTableRowDef<T> {
  /**
   * Predicate selecting which data rows render this variant instead of the
   * per-column row. Receives the datum and its 0-based dataset index and returns
   * `true` to render the variant. In a non-virtualized table the index equals
   * the row's rendered position; under `[forTableVirtualized]` it is the
   * **absolute** index into the full dataset. Evaluated for every datum on each
   * change-detection pass, so keep it cheap and free of side effects.
   *
   * Mandatory: it is seeded with the `unsetInput` sentinel rather than declared
   * `input.required` so the registry can skip a def that has registered but not
   * been bound yet, and an unbound def throws in dev mode.
   */
  readonly when = input(unsetInput<(row: T, index: number) => boolean>());

  /**
   * The variant's full-span content template. Present for a full-span def; absent
   * (and unused) when `placeholderCells` is set. A def must declare exactly one of
   * a `[forTableRowCellDef]` template or `placeholderCells` — the body validates this and
   * throws a `[forty-cdk/table]` error otherwise.
   */
  readonly cell = contentChild(ForTableRowCellDef);

  /**
   * Render this variant's matched rows as **per-column placeholder cells** instead
   * of a full-span `[forTableRowCellDef]`. Set it (the bare `placeholderCells` attribute)
   * for interleaved / trailing skeleton rows — infinite-scroll or paginated tables
   * that keep their loaded rows and append placeholder rows while the next page
   * loads. The body stamps one `[forTableCell]` per displayed column from that
   * column's `[forTablePlaceholderCellDef]` template (an empty cell when the column omits
   * it), exactly like the `loading` state, but stamps the cells disabled so
   * grid-mode arrow navigation steps over them and the roving grid stays
   * rectangular.
   *
   * A def must declare **exactly one** of a `[forTableRowCellDef]` template or
   * `placeholderCells`; declaring both or neither throws a `[forty-cdk/table]`
   * error.
   */
  readonly placeholderCells = input(false, { transform: booleanAttribute });

  constructor() {
    assertInputBound(this.when, 'table', '[forTableRowDef]', 'when');
    registerTableRowDef(this);
  }
}
