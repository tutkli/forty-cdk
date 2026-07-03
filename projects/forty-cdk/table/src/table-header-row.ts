import { Directive, ElementRef, inject, DestroyRef } from '@angular/core';

import { injectTableContext } from './table-context';

/**
 * Marks the header row of the table (`role="row"`). Registers its host
 * element with the root so `ForTable` can measure the header's height and
 * publish `--for-table-header-height` for sticky-cell CSS.
 *
 * In `grid` / `treegrid` mode the header row is the grid's first row for ARIA
 * numbering, so it emits `aria-rowindex="1"` and every data row's index shifts
 * up by one (matching the APG Data Grid example, where `aria-rowcount` counts
 * the header row too).
 */
@Directive({
  selector: '[forTableHeaderRow]',
  exportAs: 'forTableHeaderRow',
  host: {
    role: 'row',
    '[attr.aria-rowindex]': 'rowIndex()',
  },
})
export class ForTableHeaderRow {
  protected readonly ctx = injectTableContext('ForTableHeaderRow');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** 1-based `aria-rowindex` for the header row (`1` in grid / treegrid mode, else absent). */
  protected readonly rowIndex = this.ctx.headerRowIndex;

  constructor() {
    const el = this.#host.nativeElement;
    this.ctx.registerHeaderRow(el);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterHeaderRow(el));
  }
}
