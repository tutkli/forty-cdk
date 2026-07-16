import {
  booleanAttribute,
  contentChild,
  Directive,
  inject,
  input,
  TemplateRef,
} from '@angular/core';

import { coerceSticky, type TableStickyValue } from './table-context';

/**
 * Template context handed to each `[forDataCell]` stamped by `ForTableBody`:
 * the row datum (`let-row`) and its 0-based index in the rendered list
 * (`let-i="index"`).
 */
export interface ForDataCellContext<T> {
  /** The row datum for this cell (`let-row`). */
  $implicit: T;
  /** 0-based index of the row in the rendered list (`let-i="index"`). */
  index: number;
}

/**
 * Marks the header-cell template of a column definition. Place on an
 * `<ng-template forHeaderCell>` inside a `[forColumnDef]`; its content is
 * stamped into the column's `[forTableHeaderCell]` by `ForTableBody`.
 */
@Directive({ selector: 'ng-template[forHeaderCell]' })
export class ForHeaderCell {
  /** The captured header-cell template. */
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Marks the data-cell template of a column definition. Place on an
 * `<ng-template forDataCell>` inside a `[forColumnDef]`; its content is stamped
 * into the column's `[forTableCell]` for every rendered row, with the row datum
 * and index exposed through `ForDataCellContext`.
 *
 * Bind `[forDataCellRow]` to the same array passed to `ForTableBody`'s `rows`
 * to type `let-row` — the input is read only for type inference, never at
 * runtime.
 */
@Directive({ selector: 'ng-template[forDataCell]' })
export class ForDataCell<T> {
  /** The captured data-cell template, typed with `ForDataCellContext<T>`. */
  readonly template = inject<TemplateRef<ForDataCellContext<T>>>(TemplateRef);

  /**
   * Type-inference hint: bind to the same collection as `ForTableBody`'s `rows`
   * so `let-row` is typed as the row type. Read only by the compiler; the
   * directive never touches its value.
   */
  readonly rowType = input<readonly T[]>([], { alias: 'forDataCellRow' });

  /** Narrows the template context type for `let-row` under strict template checking. */
  static ngTemplateContextGuard<T>(
    _directive: ForDataCell<T>,
    _context: unknown,
  ): _context is ForDataCellContext<T> {
    return true;
  }
}

/**
 * Marks the placeholder/skeleton template of a column definition. Optional;
 * place on an `<ng-template forPlaceholderCell>` inside a `[forColumnDef]`. When
 * `ForTableBody` is in its `loading` state it stamps this into the column's
 * `[forTableCell]` for each placeholder row (falling back to an empty cell when
 * a column omits it).
 */
@Directive({ selector: 'ng-template[forPlaceholderCell]' })
export class ForPlaceholderCell {
  /** The captured placeholder-cell template. */
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Declarative definition of a single table column, co-locating its header,
 * data, and (optional) placeholder templates plus its per-column config in one
 * place. Place `[forColumnDef]` on an `<ng-container>` inside a `<for-table-body>`;
 * the container renders nothing itself — `ForTableBody` harvests the defs and
 * stamps the header row and data rows from them.
 *
 * @example
 * ```html
 * <ng-container forColumnDef="name" sticky sortable resizable resizeAriaLabel="Resize name">
 *   <ng-template forHeaderCell>Name</ng-template>
 *   <ng-template forDataCell [forDataCellRow]="rows()" let-row>{{ row.name }}</ng-template>
 * </ng-container>
 * ```
 */
@Directive({ selector: '[forColumnDef]' })
export class ForColumnDef {
  /** Column identifier — reflected as `data-column` on the stamped cells and used to key the resize width var. */
  readonly name = input.required<string>({ alias: 'forColumnDef' });

  /**
   * Sticky placement forwarded to both the header cell and every data cell:
   * `true` (or the bare `sticky` attribute) pins to the start edge, `'end'` to
   * the end edge, `false` (default) is not sticky. The consumer applies
   * `position: sticky` + offsets in CSS off the emitted `data-sticky` hook.
   */
  readonly sticky = input(false as TableStickyValue, { transform: coerceSticky });

  /**
   * When set, the column's header cell becomes a sortable affordance: `ForTableBody`
   * applies `[forTableSortHeader]`, derives its direction from the body's `sort`
   * input, and re-emits activation through the body's `sortChange` output.
   */
  readonly sortable = input(false, { transform: booleanAttribute });

  /**
   * When set, `ForTableBody` renders a `[forTableColumnResizer]` (with `autoFit`)
   * inside the column's header cell and re-emits its commits through the body's
   * `resizeCommit` output. Provide `resizeAriaLabel` so the handle is named.
   */
  readonly resizable = input(false, { transform: booleanAttribute });

  /**
   * Accessible name for the auto-wired resize handle (only meaningful with
   * `resizable`). Supplied by the consumer so it is localizable; `null` (default)
   * ships no `aria-label`.
   */
  readonly resizeAriaLabel = input<string | null>(null);

  /**
   * `grid-template-columns` track fragment for this column (e.g. `'160px'`,
   * `'minmax(160px, 1fr)'`). When unset, `ForTableBody` falls back to the
   * published `--for-table-col-<name>-width` resize var with a `minmax(0, 1fr)`
   * default, so a resized column drives its own track.
   */
  readonly width = input<string | null>(null);

  /** The column's header-cell template. */
  readonly header = contentChild.required(ForHeaderCell);
  /** The column's data-cell template. */
  readonly dataCell = contentChild.required(ForDataCell);
  /** The column's optional placeholder-cell template. */
  readonly placeholderCell = contentChild(ForPlaceholderCell);
}
