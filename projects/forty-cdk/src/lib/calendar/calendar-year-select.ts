import { computed, Directive, input } from '@angular/core';

import { type CalendarYearOption, injectCalendarContext } from './calendar-context';

/**
 * Wires a native `<select>` to a `ForCalendar`'s year navigation. Apply on a
 * `<select>` element inside `[forCalendar]`: the directive keeps the select
 * showing the visible year and navigates the calendar when the user picks a
 * different one, without mutating the selected date.
 *
 * Render the `<option>` elements yourself from {@link years} so you keep full
 * control over their markup:
 *
 * ```html
 * <select forCalendarYearSelect #y="forCalendarYearSelect" [minYear]="1900" [maxYear]="2100">
 *   @for (opt of y.years(); track opt.value) {
 *     <option [value]="opt.value" [disabled]="opt.disabled">{{ opt.value }}</option>
 *   }
 * </select>
 * ```
 */
@Directive({
  selector: 'select[forCalendarYearSelect]',
  exportAs: 'forCalendarYearSelect',
  host: {
    '[value]': 'ctx.visibleYear()',
    '[disabled]': 'ctx.disabled()',
    '(change)': 'onChange($event)',
  },
})
export class ForCalendarYearSelect {
  protected readonly ctx = injectCalendarContext('ForCalendarYearSelect');

  /**
   * Lowest year listed in {@link years}. Defaults to 100 years before the
   * current year when `null`.
   */
  readonly minYear = input<number | null>(null);

  /**
   * Highest year listed in {@link years}. Defaults to 10 years after the
   * current year when `null`.
   */
  readonly maxYear = input<number | null>(null);

  /**
   * The selectable years, from {@link minYear} to {@link maxYear} inclusive.
   * Each entry is `disabled` when the whole year falls outside the calendar's
   * `[min, max]`. The default window is anchored to the current year (not the
   * visible year), so navigating far away never drops the current year off the
   * list.
   */
  readonly years = computed<readonly CalendarYearOption[]>(() => {
    const currentYear = this.ctx.adapter.getYear(this.ctx.adapter.today());
    const min = this.minYear() ?? currentYear - 100;
    const max = this.maxYear() ?? currentYear + 10;
    const out: CalendarYearOption[] = [];
    for (let year = min; year <= max; year++) {
      out.push({ value: year, disabled: this.ctx.isYearDisabled(year) });
    }
    return out;
  });

  protected onChange(event: Event): void {
    this.ctx.goToYear(Number((event.target as HTMLSelectElement).value));
  }
}
