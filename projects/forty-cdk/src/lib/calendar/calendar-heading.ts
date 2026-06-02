import { Directive } from '@angular/core';

import { injectCalendarContext } from './calendar-context';

/**
 * The month/year heading. Apply on a heading element (e.g. `<h2>`) and render
 * its `label()` as the content: `<h2 forCalendarHeading #h="forCalendarHeading">{{ h.label() }}</h2>`.
 * It is an `aria-live="polite"` region, and the grid is `aria-labelledby` this
 * element, so screen readers announce the new period as the user pages.
 */
@Directive({
  selector: '[forCalendarHeading]',
  exportAs: 'forCalendarHeading',
  host: {
    'aria-live': 'polite',
    '[id]': 'ctx.headingId()',
  },
})
export class ForCalendarHeading {
  protected readonly ctx = injectCalendarContext('ForCalendarHeading');

  /** The visible month's accessible label, e.g. `"June 2026"`. */
  readonly label = this.ctx.visibleMonthLabel;
}
