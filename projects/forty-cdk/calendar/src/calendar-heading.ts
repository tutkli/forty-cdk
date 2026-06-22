import { Directive, ElementRef, inject } from '@angular/core';

import { injectCalendarContext } from './calendar-context';

/**
 * The month/year heading. Apply on a heading element (e.g. `<h2>`) and render
 * its `label()` as the content: `<h2 forCalendarHeading #h="forCalendarHeading">{{ h.label() }}</h2>`.
 * The grid is `aria-labelledby` this element, so it names the visible period.
 *
 * It is **not** an `aria-live` region: paging the month announces the new
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
  protected readonly ctx = injectCalendarContext('ForCalendarHeading');

  /** The visible month's accessible label, e.g. `"June 2026"`. */
  readonly label = this.ctx.visibleMonthLabel;

  constructor() {
    this.ctx.adoptHeadingId(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
  }
}
