import { computed, Directive, input } from '@angular/core';

import { injectCalendarContext } from './calendar-context';

/**
 * Navigates the calendar to the next month. Apply on a `<button>`. Keeps DOM
 * focus on itself while paging; the `aria-live` heading announces the new
 * month. Auto-disabled when paging forward would leave the `max` bound, or
 * when the whole calendar is disabled.
 *
 * Provide an accessible name via the `[ariaLabel]` input (e.g.
 * `[ariaLabel]="'Next month'"`).
 */
@Directive({
  selector: '[forCalendarNextButton]',
  exportAs: 'forCalendarNextButton',
  host: {
    type: 'button',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'ctx.pageMonths(1)',
  },
})
export class ForCalendarNextButton {
  protected readonly ctx = injectCalendarContext('ForCalendarNextButton');

  /** Accessible name for the button. A `null` (default) or empty value emits no attribute. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly disabled = computed(
    () => this.ctx.disabled() || this.ctx.isNextMonthDisabled(),
  );
}
