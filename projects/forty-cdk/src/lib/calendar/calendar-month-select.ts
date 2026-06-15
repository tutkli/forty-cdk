import { Directive } from '@angular/core';

import { injectCalendarContext } from './calendar-context';

/**
 * Wires a native `<select>` to a `ForCalendar`'s month navigation. Apply on a
 * `<select>` element inside `[forCalendar]`: the directive keeps the select
 * showing the visible month and navigates the calendar when the user picks a
 * different one, without mutating the selected date.
 *
 * Render the `<option>` elements yourself from {@link options} so you keep full
 * control over their markup, labels, and any placeholder:
 *
 * ```html
 * <select forCalendarMonthSelect #m="forCalendarMonthSelect">
 *   @for (opt of m.options(); track opt.value) {
 *     <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.label }}</option>
 *   }
 * </select>
 * ```
 */
@Directive({
  selector: 'select[forCalendarMonthSelect]',
  exportAs: 'forCalendarMonthSelect',
  host: {
    '[value]': 'ctx.visibleMonthNumber()',
    '[disabled]': 'ctx.disabled()',
    '(change)': 'onChange($event)',
  },
})
export class ForCalendarMonthSelect {
  protected readonly ctx = injectCalendarContext('ForCalendarMonthSelect');

  /** The twelve localized, bounds-aware month options for the visible year. */
  readonly options = this.ctx.monthOptions;

  protected onChange(event: Event): void {
    this.ctx.goToMonth(Number((event.target as HTMLSelectElement).value));
  }
}
