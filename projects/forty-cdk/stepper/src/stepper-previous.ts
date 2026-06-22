import { Directive } from '@angular/core';

import { injectStepperContext } from './stepper-context';

/**
 * "Previous" button for the stepper. Apply on a `<button>` element. Reflects
 * `aria-disabled="true"` when `canRetreat()` is false (first step reached or
 * root disabled).
 *
 * The button retains its native `type="button"` attribute via the `type` host
 * binding to prevent accidental form submission.
 *
 * Clicking while `aria-disabled` is a no-op because `previous()` guards
 * internally.
 */
@Directive({
  selector: 'button[forStepperPrevious]',
  exportAs: 'forStepperPrevious',
  host: {
    type: 'button',
    '[attr.aria-disabled]': '!ctx.canRetreat() ? "true" : null',
    '(click)': 'onClick()',
  },
})
export class ForStepperPrevious {
  protected readonly ctx = injectStepperContext('ForStepperPrevious');

  protected onClick(): void {
    this.ctx.previous();
  }
}
