import { Directive, ElementRef, inject, input, signal } from '@angular/core';

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

  /**
   * The header cell's host element (`role="columnheader"`). Exposed so a descendant
   * `[forTableColumnResizer]` can resolve the enclosing cell through DI to measure its
   * base width — robust to `hostDirectives` composition, where the `[forTableHeaderCell]`
   * selector attribute is not reflected onto the wrapper's host element.
   */
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Column identifier, reflected as `data-column`. Required by later phases (sort, resize, reorder). */
  readonly name = input.required<string>();

  readonly #labelEl = signal<HTMLElement | null>(null);

  /**
   * The element a descendant `[forTableColumnLabel]` marks as this column's label
   * text, or `null` when no marker is present. A sibling `[forTableColumnResizer]`
   * reads it to measure the header label for header-inclusive auto-fit, isolating
   * the label from the resize handle / sort affordance without DOM assumptions.
   */
  readonly labelEl = this.#labelEl.asReadonly();

  /** Registers a descendant `[forTableColumnLabel]` as this header cell's label element. */
  registerLabel(el: HTMLElement): void {
    this.#labelEl.set(el);
  }

  /** Unregisters the label element. Reference-based; safe to call if never registered. */
  unregisterLabel(el: HTMLElement): void {
    if (this.#labelEl() === el) {
      this.#labelEl.set(null);
    }
  }

  /**
   * Sticky placement for this header cell. `true` (or the bare `sticky`
   * attribute) pins to the start edge; `'end'` pins to the end edge; `false`
   * (default) is not sticky. The consumer applies `position: sticky` and the
   * appropriate `top` / `left` / `right` offset in CSS — this input only
   * provides the `data-sticky` hook.
   */
  readonly sticky = input(false as TableStickyValue, { transform: coerceSticky });
}
