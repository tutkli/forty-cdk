import { Directive } from '@angular/core';

import { reflectDisabled } from 'forty-cdk/core';
import { injectCalendarContext } from './calendar-context';

/**
 * The view-cycle button in the calendar header. Apply on a `<button>`. Each
 * click advances the view one step coarser (`day → month → year`), clamped at
 * `'year'`. Reflects `data-view` so consumers can style it per view. Disabled
 * when the whole calendar is disabled.
 *
 * Bind the `label` signal to the button text to show the active view label
 * (e.g. `"June 2026"` in day view, `"2026"` in month view, `"2024 – 2035"` in
 * year view).
 */
@Directive({
  selector: '[forCalendarViewTrigger]',
  exportAs: 'forCalendarViewTrigger',
  host: {
    type: 'button',
    '[attr.data-view]': 'ctx.view()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '(click)': 'ctx.cycleView()',
  },
})
export class ForCalendarViewTrigger {
  protected readonly ctx = injectCalendarContext('ForCalendarViewTrigger');

  /** Label for the active view, e.g. `"June 2026"` / `"2026"` / `"2016 – 2027"`. */
  readonly label = this.ctx.viewTriggerLabel;

  constructor() {
    reflectDisabled(this.ctx.disabled);
  }
}
