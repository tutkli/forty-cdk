import { Directive } from '@angular/core';

import { injectCalendarContext } from './calendar-context';

/**
 * Marks the calendar grid's header rowgroup. Apply on a `<thead>` holding a
 * single row of `<th scope="col">` weekday headers.
 *
 * Exposes `weekDays()` so the header row can be iterated from this piece, as an
 * alternative to reading it off `[forCalendarGrid]`.
 */
@Directive({
  selector: '[forCalendarGridHeader]',
  exportAs: 'forCalendarGridHeader',
})
export class ForCalendarGridHeader {
  protected readonly ctx = injectCalendarContext('ForCalendarGridHeader');

  /** Weekday column headers for the visible month, starting at `firstDayOfWeek`. */
  readonly weekDays = this.ctx.weekDays;
}
