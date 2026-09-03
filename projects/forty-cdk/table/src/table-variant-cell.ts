import { computed, Directive } from '@angular/core';

import { injectTableContext } from './table-context';

/**
 * Marks the single full-span cell of a presentational row — a group separator, a
 * section header, a summary line — authored with the raw primitives. Emits the
 * markup `<for-table-body>` stamps for a `[forTableRowCellDef]` variant row: the
 * `role` derived from the root's `mode` (`'cell'` in `table` mode, `'gridcell'`
 * otherwise), `aria-colindex="1"`, an `aria-colspan` covering the grid's rendered
 * columns, and the `data-row-variant` styling hook.
 *
 * Unlike `[forTableCell]` it registers **no** cell handle, which is the whole point:
 * in `grid` / `treegrid` mode the row contributes nothing to the roving grid, so
 * arrow navigation steps over it, the column count keeps coming from the data rows
 * around it, and the header row still joins the composite tab stop. Spanning the row
 * visually stays the consumer's CSS (`grid-column: 1 / -1`, or a `colspan` attribute
 * in a native `<table>`).
 */
@Directive({
  selector: '[forTableVariantCell]',
  exportAs: 'forTableVariantCell',
  host: {
    'data-row-variant': '',
    '[attr.role]': 'role()',
    '[attr.aria-colindex]': '1',
    '[attr.aria-colspan]': 'colSpan()',
  },
})
export class ForTableVariantCell {
  readonly #ctx = injectTableContext('ForTableVariantCell');

  protected readonly role = computed(() => (this.#ctx.mode() === 'table' ? 'cell' : 'gridcell'));

  protected readonly colSpan = computed<number | null>(() => {
    const cols = this.#ctx.columnCount();
    return cols > 0 ? cols : null;
  });
}
