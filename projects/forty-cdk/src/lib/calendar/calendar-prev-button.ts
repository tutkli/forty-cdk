import { computed, Directive, input } from '@angular/core';

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { injectCalendarContext } from './calendar-context';

/**
 * Pages the calendar backward. In `day` view pages by one month; in `month` view
 * pages by one year; in `year` view pages by one block. Apply on a `<button>`.
 * Keeps DOM focus on itself while paging; the `aria-live` heading announces the
 * new period. Auto-disabled at the view's bound, or when the whole calendar is
 * disabled.
 *
 * Provide an accessible name via the `[ariaLabel]` input (e.g.
 * `[ariaLabel]="'Previous'"`).
 */
@Directive({
  selector: '[forCalendarPrevButton]',
  exportAs: 'forCalendarPrevButton',
  host: {
    type: 'button',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'ctx.pagePrevious()',
  },
})
export class ForCalendarPrevButton {
  protected readonly ctx = injectCalendarContext('ForCalendarPrevButton');

  /** Accessible name for the button. A `null` (default) or empty value emits no attribute. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly disabled = computed(
    () => this.ctx.disabled() || this.ctx.isPreviousDisabled(),
  );

  constructor() {
    reflectDisabled(this.disabled);
  }
}
