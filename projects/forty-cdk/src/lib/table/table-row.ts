import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
  type Signal,
} from '@angular/core';

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
    '[attr.aria-level]': 'ariaLevel()',
    '[attr.aria-posinset]': 'posinset()',
    '[attr.aria-setsize]': 'setsize()',
    '[attr.aria-expanded]': 'ariaExpanded()',
    '[attr.data-state]': 'expandState()',
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

  /** 1-based tree depth for `aria-level` in `mode="treegrid"`. Ignored in other modes. */
  readonly level = input(1, { transform: numberAttribute });

  /** Marks this row as an expandable parent — emits `aria-expanded` + `data-state`. */
  readonly expandable = input(false, { transform: booleanAttribute });

  /**
   * Absolute 0-based index of this row in the full virtualized dataset. Set by the
   * consumer when rendering a window via `[forTableVirtualized]`; drives the absolute
   * `aria-rowindex` and keeps the focused row mounted across recycling. Leave unset
   * (default `null`) for non-virtualized tables. Ignored in `mode="table"`.
   */
  readonly virtualIndex = input<number | null, unknown>(null, {
    transform: (v) => (v == null ? null : numberAttribute(v)),
  });

  protected readonly rowIndex = computed<number | null>(() => {
    if (this.ctx.mode() === 'table') {
      return null;
    }
    const vi = this.virtualIndex();
    return vi !== null ? vi + 1 : this.ctx.rowIndexOf(this.#host) + 1;
  });

  readonly selectionMode: Signal<TableSelectionMode> = this.ctx.selectionMode;

  readonly selected = computed(() => {
    const v = this.value();
    return v !== undefined && this.ctx.isRowSelected(v);
  });

  protected readonly ariaSelected = computed<'true' | 'false' | null>(() =>
    this.ctx.selectionMode() === 'none' ? null : this.selected() ? 'true' : 'false',
  );

  /** Whether this expandable row is currently open. False for non-expandable rows. */
  readonly expanded = computed(() => {
    const v = this.value();
    return v !== undefined && this.ctx.isRowExpanded(v);
  });

  /** Toggles this row's expansion. No-op when the row is not expandable or has no `[value]`. */
  toggleExpanded(): void {
    if (this.expandable()) {
      this.ctx.toggleRowExpansion(this.value());
    }
  }

  protected readonly ariaLevel = computed<number | null>(() =>
    this.ctx.mode() === 'treegrid' ? this.level() : null,
  );
  protected readonly posinset = computed<number | null>(() =>
    this.ctx.mode() === 'treegrid' ? this.ctx.rowPosinset(this.#host) : null,
  );
  protected readonly setsize = computed<number | null>(() =>
    this.ctx.mode() === 'treegrid' ? this.ctx.rowSetsize(this.#host) : null,
  );
  protected readonly ariaExpanded = computed<'true' | 'false' | null>(() =>
    this.ctx.mode() === 'treegrid' && this.expandable()
      ? this.expanded()
        ? 'true'
        : 'false'
      : null,
  );
  protected readonly expandState = computed<'open' | 'closed' | null>(() =>
    this.ctx.mode() === 'treegrid' && this.expandable()
      ? this.expanded()
        ? 'open'
        : 'closed'
      : null,
  );

  constructor() {
    const handle = {
      host: this.#host,
      cells: this.#cells.items,
      value: this.value,
      level: this.level,
      expandable: this.expandable,
      virtualIndex: this.virtualIndex,
    };
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
