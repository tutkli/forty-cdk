import { computed, inject, type Signal } from '@angular/core';

import { FOR_TABLE_CONTEXT } from './table-context';

/**
 * The `tabindex` an interactive control placed inside a table cell carries: `0` in
 * `mode="table"`, where each control is its own tab stop, and `-1` in `grid` /
 * `treegrid`, where the control yields to the grid's single tab stop and is reached
 * through cell entry (`Enter` / `F2`). Outside a `[forTable]` it answers `0`, so a
 * control that also renders outside tables can bind it unconditionally.
 *
 * Must be called in an injection context. Bind the result as `[attr.tabindex]` on
 * a natively focusable element.
 */
export function injectTableCellTabIndex(): Signal<0 | -1> {
  const table = inject(FOR_TABLE_CONTEXT, { optional: true });
  return computed(() => (!table || table.mode() === 'table' ? 0 : -1));
}
