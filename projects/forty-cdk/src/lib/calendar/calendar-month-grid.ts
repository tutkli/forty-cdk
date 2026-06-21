import { Directive } from '@angular/core';

import { injectCalendarNavigationContext } from './calendar-context';

/**
 * The month picker grid (`role="grid"`). Apply on a `<table>`. Labelled by the
 * `[forCalendarHeading]` via `aria-labelledby`. Exposes `rows()` — iterate
 * rows then cells, binding each cell's `month` to `[forCalendarMonthCell]`.
 *
 * Shows the 12 months of the visible year in 3-column rows. Used when
 * `view === 'month'`.
 */
@Directive({
  selector: '[forCalendarMonthGrid]',
  exportAs: 'forCalendarMonthGrid',
  host: {
    role: 'grid',
    '[attr.aria-labelledby]': 'ctx.headingId()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.data-view]': '"month"',
  },
})
export class ForCalendarMonthGrid {
  protected readonly ctx = injectCalendarNavigationContext('ForCalendarMonthGrid');

  /** Rows of the month picker grid (3 columns) for the visible year. */
  readonly rows = this.ctx.monthRows;
}
