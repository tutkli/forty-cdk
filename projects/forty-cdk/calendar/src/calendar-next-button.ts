import { computed, Directive, input } from '@angular/core';

import { hostAriaLabel } from 'forty-cdk/core';

import { injectCalendarContext } from './calendar-context';

/**
 * Pages the calendar forward. In `day` view pages by one month; in `month` view
 * pages by one year; in `year` view pages by one block. Apply on a `<button>`.
 * Keeps DOM focus on itself while paging; the `aria-live` heading announces the
 * new period. Auto-disabled at the view's bound, or when the whole calendar is
 * disabled.
 *
 * Reflects the disabled state through `aria-disabled` + `data-disabled` only —
 * never the native `disabled` attribute — so a button that auto-disables at the
 * bound while focused keeps DOM focus instead of being ejected from the focus
 * order. Activation is a no-op while disabled.
 *
 * Provide an accessible name via the `[ariaLabel]` input (e.g.
 * `[ariaLabel]="'Next'"`).
 */
@Directive({
  selector: '[forCalendarNextButton]',
  exportAs: 'forCalendarNextButton',
  host: {
    type: 'button',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'page()',
  },
})
export class ForCalendarNextButton {
  protected readonly ctx = injectCalendarContext('ForCalendarNextButton');

  /** Accessible name for the button. A `null` (default) or empty value emits no attribute. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  protected readonly disabled = computed(() => this.ctx.disabled() || this.ctx.isNextDisabled());

  protected page(): void {
    if (this.disabled()) {
      return;
    }
    this.ctx.pageNext();
  }
}
