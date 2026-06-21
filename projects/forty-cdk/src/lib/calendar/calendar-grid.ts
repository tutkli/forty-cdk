import { Directive } from '@angular/core';

import { injectCalendarContext } from './calendar-context';

/**
 * The calendar's date table (`role="grid"`). Apply on a `<table>`. Labelled by
 * the `[forCalendarHeading]` via `aria-labelledby`, and reflects `aria-disabled`
 * / `aria-readonly` from the root.
 *
 * Exposes the month's `weekDays()` (column headers) and `weeks()` (day rows)
 * for the consumer to iterate — bind `cell.date` to each `[forCalendarCell]`.
 */
@Directive({
  selector: '[forCalendarGrid]',
  exportAs: 'forCalendarGrid',
  host: {
    role: 'grid',
    '[attr.aria-labelledby]': 'ctx.headingId()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
  },
})
export class ForCalendarGrid {
  protected readonly ctx = injectCalendarContext('ForCalendarGrid');

  /** Weekday column headers for the visible month, starting at `firstDayOfWeek`. */
  readonly weekDays = this.ctx.weekDays;

  /** Week rows of the visible month, including outside-month padding days. */
  readonly weeks = this.ctx.weeks;
}
