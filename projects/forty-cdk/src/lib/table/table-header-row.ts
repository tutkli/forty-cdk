import { Directive, ElementRef, inject, DestroyRef } from '@angular/core';

import { injectTableMeasurement } from './table-context';

/**
 * Marks the header row of the table (`role="row"`). Registers its host
 * element with the root so `ForTable` can measure the header's height and
 * publish `--for-table-header-height` for sticky-cell CSS.
 */
@Directive({
  selector: '[forTableHeaderRow]',
  exportAs: 'forTableHeaderRow',
  host: {
    role: 'row',
  },
})
export class ForTableHeaderRow {
  protected readonly ctx = injectTableMeasurement('ForTableHeaderRow');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const el = this.#host.nativeElement;
    this.ctx.registerHeaderRow(el);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterHeaderRow(el));
  }
}
