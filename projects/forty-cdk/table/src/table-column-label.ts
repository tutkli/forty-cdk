import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { ForTableHeaderCell } from './table-header-cell';

/**
 * Marks the element inside a `[forTableHeaderCell]` that carries the column's
 * label text. It owns no role, ARIA, or DOM of its own — it is a structure-agnostic
 * hook so a sibling `[forTableColumnResizer]` with `[fitIncludesHeader]` can measure
 * the header label in isolation, ignoring the resize handle, sort affordance, and any
 * other header chrome. Wrap only the text you want the header-inclusive auto-fit to
 * account for.
 *
 * @example
 * ```html
 * <th forTableHeaderCell name="dept">
 *   <span forTableColumnLabel>Department</span>
 *   <button forTableColumnResizer column="dept" fitIncludesHeader [(width)]="deptWidth"
 *           aria-label="Resize Department column"></button>
 * </th>
 * ```
 */
@Directive({
  selector: '[forTableColumnLabel]',
  exportAs: 'forTableColumnLabel',
})
export class ForTableColumnLabel {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #headerCell = inject(ForTableHeaderCell, { optional: true });

  constructor() {
    if (!this.#headerCell) {
      throw new Error(
        '[forty-cdk/table] ForTableColumnLabel must be used inside a [forTableHeaderCell] element.',
      );
    }
    this.#headerCell.registerLabel(this.#host);
    inject(DestroyRef).onDestroy(() => this.#headerCell?.unregisterLabel(this.#host));
  }
}
