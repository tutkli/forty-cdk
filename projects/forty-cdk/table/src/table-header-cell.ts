import { Directive, input } from '@angular/core';

import { coerceSticky, injectTableContext, type TableStickyValue } from './table-context';

/**
 * Marks a header cell (`role="columnheader"`). Requires a `name` input that
 * identifies the column — reflected as `data-column` for later phases (sort,
 * resize, reorder) to key off. Optionally sticky via the `sticky` input.
 */
@Directive({
  selector: '[forTableHeaderCell]',
  exportAs: 'forTableHeaderCell',
  host: {
    role: 'columnheader',
    '[attr.data-column]': 'name()',
    '[attr.data-sticky]': "sticky() ? (sticky() === 'end' ? 'end' : '') : null",
  },
})
export class ForTableHeaderCell {
  protected readonly ctx = injectTableContext('ForTableHeaderCell');

  /** Column identifier, reflected as `data-column`. Required by later phases (sort, resize, reorder). */
  readonly name = input.required<string>();

  /**
   * Sticky placement for this header cell. `true` (or the bare `sticky`
   * attribute) pins to the start edge; `'end'` pins to the end edge; `false`
   * (default) is not sticky. The consumer applies `position: sticky` and the
   * appropriate `top` / `left` / `right` offset in CSS — this input only
   * provides the `data-sticky` hook.
   */
  readonly sticky = input(false as TableStickyValue, { transform: coerceSticky });
}
