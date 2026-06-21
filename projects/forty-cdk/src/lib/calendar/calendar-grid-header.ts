import { Directive } from '@angular/core';

import { injectCalendarNavigationContext } from './calendar-context';

/**
 * Marks the calendar grid's header rowgroup. Apply on a `<thead>` holding a
 * single row of `<th scope="col">` weekday headers.
 *
 * Reflects `role="rowgroup"` so the weekday header is exposed as a distinct
 * rowgroup inside the `role="grid"` table — assistive tech announces the
 * column headers as their own group rather than folding them into the day
 * rows. (A bare `<thead>` carries the implicit role, but the grid's explicit
 * `role="grid"` suppresses the table's native row/rowgroup semantics, so the
 * header must restate it.)
 *
 * Also exposes `weekDays()` so the header row can be iterated from this piece,
 * as an alternative to reading it off `[forCalendarGrid]`.
 */
@Directive({
  selector: '[forCalendarGridHeader]',
  exportAs: 'forCalendarGridHeader',
  host: {
    role: 'rowgroup',
  },
})
export class ForCalendarGridHeader {
  protected readonly ctx = injectCalendarNavigationContext('ForCalendarGridHeader');

  /** Weekday column headers for the visible month, starting at `firstDayOfWeek`. */
  readonly weekDays = this.ctx.weekDays;
}
