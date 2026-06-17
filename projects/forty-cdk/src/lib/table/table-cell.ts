import { computed, Directive, input } from '@angular/core';

import { coerceSticky, injectTableContext, type TableStickyValue } from './table-context';

/**
 * Marks a data cell. The `role` is derived from the root's `mode`: `'cell'`
 * in `table` mode and `'gridcell'` in `grid` / `'treegrid'` mode. Requires a
 * `name` input that identifies the column — reflected as `data-column`.
 * Optionally sticky via the `sticky` input.
 */
@Directive({
  selector: '[forTableCell]',
  exportAs: 'forTableCell',
  host: {
    '[attr.role]': 'role()',
    '[attr.data-column]': 'name()',
    '[attr.data-sticky]': "sticky() ? (sticky() === 'end' ? 'end' : '') : null",
  },
})
export class ForTableCell {
  protected readonly ctx = injectTableContext('ForTableCell');

  protected readonly role = computed(() => (this.ctx.mode() === 'table' ? 'cell' : 'gridcell'));

  /** Column identifier, reflected as `data-column`. Required by later phases (sort, resize, reorder). */
  readonly name = input.required<string>();

  /**
   * Sticky placement for this data cell. `true` (or the bare `sticky`
   * attribute) pins to the start edge; `'end'` pins to the end edge; `false`
   * (default) is not sticky. The consumer applies `position: sticky` and the
   * appropriate offsets in CSS — this input only provides the `data-sticky` hook.
   */
  readonly sticky = input(false as TableStickyValue, { transform: coerceSticky });
}
