import { computed, Directive, input } from '@angular/core';

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { injectCalendarContext } from './calendar-context';

/**
 * Navigates the calendar to the previous month. Apply on a `<button>`. Keeps
 * DOM focus on itself while paging; the `aria-live` heading announces the new
 * month. Auto-disabled when paging back would leave the `min` bound, or when
 * the whole calendar is disabled.
 *
 * Provide an accessible name via the `[ariaLabel]` input (e.g.
 * `[ariaLabel]="'Previous month'"`).
 */
@Directive({
  selector: '[forCalendarPrevButton]',
  exportAs: 'forCalendarPrevButton',
  host: {
    type: 'button',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'ctx.pageMonths(-1)',
  },
})
export class ForCalendarPrevButton {
  protected readonly ctx = injectCalendarContext('ForCalendarPrevButton');

  /** Accessible name for the button. A `null` (default) or empty value emits no attribute. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly disabled = computed(
    () => this.ctx.disabled() || this.ctx.isPreviousMonthDisabled(),
  );

  constructor() {
    reflectDisabled(this.disabled);
  }
}
