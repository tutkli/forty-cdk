import { Directive, ElementRef, inject } from '@angular/core';

import { injectCalendarContext } from './calendar-context';

/**
 * The period heading. Apply on a heading element (e.g. `<h2>`) and render
 * its `label()` as the content: `<h2 forCalendarHeading #h="forCalendarHeading">{{ h.label() }}</h2>`.
 * The day, month and year grids are `aria-labelledby` this element, so it names
 * the period the active view shows.
 *
 * It is **not** an `aria-live` region: paging announces the new
 * period through a dedicated off-screen live region owned by `[forCalendar]`,
 * so the grid's accessible name is re-read on demand without the heading
 * itself double-announcing on every render.
 */
@Directive({
  selector: '[forCalendarHeading]',
  exportAs: 'forCalendarHeading',
  host: {
    '[id]': 'ctx.headingId()',
  },
})
export class ForCalendarHeading {
  private readonly ctx = injectCalendarContext('ForCalendarHeading');

  /**
   * The label of the period the active view shows: the month and year in day
   * view (`"June 2026"`), the year in month view (`"2026"`), the block of years
   * in year view (`"2016 – 2027"`).
   */
  readonly label = this.ctx.viewTriggerLabel;

  constructor() {
    this.ctx.adoptHeadingId(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
  }
}
