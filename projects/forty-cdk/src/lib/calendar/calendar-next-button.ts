import { computed, Directive, input } from '@angular/core';

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { injectCalendarNavigationContext } from './calendar-context';

/**
 * Pages the calendar forward. In `day` view pages by one month; in `month` view
 * pages by one year; in `year` view pages by one block. Apply on a `<button>`.
 * Keeps DOM focus on itself while paging; the `aria-live` heading announces the
 * new period. Auto-disabled at the view's bound, or when the whole calendar is
 * disabled.
 *
 * Provide an accessible name via the `[ariaLabel]` input (e.g.
 * `[ariaLabel]="'Next'"`).
 */
@Directive({
  selector: '[forCalendarNextButton]',
  exportAs: 'forCalendarNextButton',
  host: {
    type: 'button',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'ctx.pageNext()',
  },
})
export class ForCalendarNextButton {
  protected readonly ctx = injectCalendarNavigationContext('ForCalendarNextButton');

  /** Accessible name for the button. A `null` (default) or empty value emits no attribute. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly disabled = computed(() => this.ctx.disabled() || this.ctx.isNextDisabled());

  constructor() {
    reflectDisabled(this.disabled);
  }
}
