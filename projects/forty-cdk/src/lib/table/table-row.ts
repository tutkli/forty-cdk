import { computed, Directive, ElementRef, inject, input, type Signal } from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { registerHandle } from '../_internal/collection/register-handle';
import {
  FOR_TABLE_ROW_CONTEXT,
  type ForTableCellHandle,
  type ForTableRowContext,
  type TableSelectionMode,
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
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.data-selected]': 'selected() ? "" : null',
    '(click)': 'onClick($event)',
  },
  providers: [{ provide: FOR_TABLE_ROW_CONTEXT, useExisting: ForTableRow }],
})
export class ForTableRow implements ForTableRowContext {
  protected readonly ctx = injectTableContext('ForTableRow');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #cells = new Collection<ForTableCellHandle>();

  /** This row's selection identity, written into the table's `[(selection)]`. Leave unset for non-selectable rows. */
  readonly value = input<unknown>();

  protected readonly rowIndex = computed<number | null>(() =>
    this.ctx.mode() === 'table' ? null : this.ctx.rowIndexOf(this.#host) + 1,
  );

  readonly selectionMode: Signal<TableSelectionMode> = this.ctx.selectionMode;

  readonly selected = computed(() => {
    const v = this.value();
    return v !== undefined && this.ctx.isRowSelected(v);
  });

  protected readonly ariaSelected = computed<'true' | 'false' | null>(() =>
    this.ctx.selectionMode() === 'none' ? null : this.selected() ? 'true' : 'false',
  );

  constructor() {
    const handle = { host: this.#host, cells: this.#cells.items, value: this.value };
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

  toggleSelected(): void {
    const v = this.value();
    if (v !== undefined) {
      this.ctx.toggleRowSelection(v);
    }
  }

  protected onClick(event: MouseEvent): void {
    const v = this.value();
    if (this.ctx.selectionMode() === 'none' || v === undefined) {
      return;
    }
    this.ctx.selectRow(v, {
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    });
  }
}
