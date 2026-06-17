import { computed, Directive, ElementRef, inject } from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { registerHandle } from '../_internal/collection/register-handle';
import {
  FOR_TABLE_ROW_CONTEXT,
  type ForTableCellHandle,
  type ForTableRowContext,
  injectTableContext,
} from './table-context';

/**
 * Marks a data row (`role="row"`). Owns the registry of its data cells (for
 * `aria-colindex`) and registers itself with the root so it joins the row index
 * space (`aria-rowindex`, 1-based over data rows in `grid`/`treegrid` mode) and
 * the 2D navigation grid.
 */
@Directive({
  selector: '[forTableRow]',
  exportAs: 'forTableRow',
  host: {
    role: 'row',
    '[attr.aria-rowindex]': 'rowIndex()',
  },
  providers: [{ provide: FOR_TABLE_ROW_CONTEXT, useExisting: ForTableRow }],
})
export class ForTableRow implements ForTableRowContext {
  protected readonly ctx = injectTableContext('ForTableRow');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #cells = new Collection<ForTableCellHandle>();

  protected readonly rowIndex = computed<number | null>(() =>
    this.ctx.mode() === 'table' ? null : this.ctx.rowIndexOf(this.#host) + 1,
  );

  constructor() {
    const handle = { host: this.#host, cells: this.#cells.items };
    registerHandle(
      handle,
      (h) => this.ctx.registerRow(h),
      (h) => this.ctx.unregisterRow(h),
    );
  }

  registerCell(handle: ForTableCellHandle): void {
    this.#cells.register(handle);
  }

  unregisterCell(handle: ForTableCellHandle): void {
    this.#cells.unregister(handle);
  }

  cellIndexOf(host: HTMLElement): number {
    return this.#cells.indexOfHost(host);
  }
}
