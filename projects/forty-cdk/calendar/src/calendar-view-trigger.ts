import { Directive } from '@angular/core';

import { hostButtonType } from 'forty-cdk/core';
import { injectCalendarContext } from './calendar-context';

/**
 * The view-cycle button in the calendar header. Apply on a `<button>`. Each
 * click advances the view one step coarser (`day → month → year`), clamped at
 * `'year'`. Reflects `data-view` so consumers can style it per view. Disabled
 * when the whole calendar is disabled.
 *
 * Reflects the disabled state through `aria-disabled` + `data-disabled` only —
 * never the native `disabled` attribute — so a focused trigger keeps DOM focus
 * instead of being ejected from the focus order. Cycling is a no-op while
 * disabled (guarded by `ctx.cycleView()`).
 *
 * Bind the `label` signal to the button text to show the active view label
 * (e.g. `"June 2026"` in day view, `"2026"` in month view, `"2024 – 2035"` in
 * year view).
 */
@Directive({
  selector: '[forCalendarViewTrigger]',
  exportAs: 'forCalendarViewTrigger',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.data-view]': 'ctx.view()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(click)': 'ctx.cycleView()',
  },
})
export class ForCalendarViewTrigger {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectCalendarContext('ForCalendarViewTrigger');

  /** Label for the active view, e.g. `"June 2026"` / `"2026"` / `"2016 – 2027"`. */
  readonly label = this.ctx.viewTriggerLabel;
}
