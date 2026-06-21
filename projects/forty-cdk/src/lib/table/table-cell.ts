import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import {
  coerceSticky,
  type ForTableCellHandle,
  injectTableRoving,
  injectTableRowContext,
  type TableStickyValue,
} from './table-context';

/**
 * Marks a data cell. The `role` is derived from the root's `mode`: `'cell'` in
 * `table` mode and `'gridcell'` in `grid` / `treegrid` mode. In grid / treegrid
 * mode the cell is a roving-tabindex target — the single active cell carries
 * `tabindex="0"` (others `-1`), reflects `data-highlighted` when focused, and
 * carries a 1-based `aria-colindex`. Arrow / Home / End / Ctrl+Home / Ctrl+End /
 * PageUp / PageDown move focus between cells. Requires a `name` input that
 * identifies the column — reflected as `data-column`. Optionally sticky and
 * optionally disabled (disabled cells are skipped during navigation).
 */
@Directive({
  selector: '[forTableCell]',
  exportAs: 'forTableCell',
  host: {
    '[attr.role]': 'role()',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-colindex]': 'colIndex()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-column]': 'name()',
    '[attr.data-sticky]': "sticky() ? (sticky() === 'end' ? 'end' : '') : null",
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForTableCell {
  protected readonly ctx = injectTableRoving('ForTableCell');
  protected readonly rowCtx = injectTableRowContext('ForTableCell');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly role = computed(() => (this.ctx.mode() === 'table' ? 'cell' : 'gridcell'));

  /** Column identifier, reflected as `data-column`. Required by later phases (sort, resize, reorder). */
  readonly name = input.required<string>();

  /**
   * Sticky placement for this data cell. `true` (or the bare `sticky` attribute)
   * pins to the start edge; `'end'` pins to the end edge; `false` (default) is not
   * sticky. The consumer applies `position: sticky` and the offsets in CSS — this
   * input only provides the `data-sticky` hook.
   */
  readonly sticky = input(false as TableStickyValue, { transform: coerceSticky });

  /**
   * Whether this data cell is disabled. Disabled cells are skipped during arrow-key
   * navigation, drop out of the tab order, and reflect `aria-disabled` / `data-disabled`.
   * Only meaningful in `grid` / `treegrid` mode.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly tabindex = computed<number | null>(() => {
    if (this.ctx.mode() === 'table') {
      return null;
    }
    if (this.disabled()) {
      return -1;
    }
    return this.ctx.cellTabIndex(this.#host);
  });

  protected readonly colIndex = computed<number | null>(() =>
    this.ctx.mode() === 'table' ? null : this.rowCtx.cellIndexOf(this.#host) + 1,
  );

  protected readonly highlighted = computed(
    () => this.ctx.mode() !== 'table' && this.ctx.isCellHighlighted(this.#host),
  );

  constructor() {
    const handle: ForTableCellHandle = { host: this.#host, disabled: this.disabled };
    registerHandle(
      handle,
      (h) => this.rowCtx.registerCell(h),
      (h) => this.rowCtx.unregisterCell(h),
    );
  }

  protected onFocus(): void {
    this.ctx.activateCell(this.#host);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    this.ctx.handleCellKeydown(event, this.#host);
  }
}
