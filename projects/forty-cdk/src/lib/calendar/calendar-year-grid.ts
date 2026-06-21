import { Directive } from '@angular/core';

import { injectCalendarNavigationContext } from './calendar-context';

/**
 * The year picker grid (`role="grid"`). Apply on a `<table>`. Labelled by the
 * `[forCalendarHeading]` via `aria-labelledby`. Exposes `rows()` — iterate
 * rows then cells, binding each cell's `year` to `[forCalendarYearCell]`.
 *
 * Shows an aligned block of `yearBlockSize` years in 3-column rows. Used when
 * `view === 'year'`.
 */
@Directive({
  selector: '[forCalendarYearGrid]',
  exportAs: 'forCalendarYearGrid',
  host: {
    role: 'grid',
    '[attr.aria-labelledby]': 'ctx.headingId()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.data-view]': '"year"',
  },
})
export class ForCalendarYearGrid {
  protected readonly ctx = injectCalendarNavigationContext('ForCalendarYearGrid');

  /** Rows of the year picker grid (3 columns) for the aligned block containing the visible year. */
  readonly rows = this.ctx.yearRows;
}
