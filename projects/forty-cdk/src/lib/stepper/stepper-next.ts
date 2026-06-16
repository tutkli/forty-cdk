import { Directive } from '@angular/core';

import { injectStepperContext } from './stepper-context';

/**
 * "Next" button for the stepper. Apply on a `<button>` element. Reflects
 * `aria-disabled="true"` when `canAdvance()` is false (last step reached, root
 * disabled, or in linear mode the current step is not completed / optional).
 *
 * The button retains its native `type="button"` attribute via the `type` host
 * binding to prevent accidental form submission.
 *
 * Clicking while `aria-disabled` is a no-op because `next()` guards internally.
 */
@Directive({
  selector: 'button[forStepperNext]',
  exportAs: 'forStepperNext',
  host: {
    type: 'button',
    '[attr.aria-disabled]': '!ctx.canAdvance() ? "true" : null',
    '(click)': 'onClick()',
  },
})
export class ForStepperNext {
  protected readonly ctx = injectStepperContext('ForStepperNext');

  protected onClick(): void {
    this.ctx.next();
  }
}
