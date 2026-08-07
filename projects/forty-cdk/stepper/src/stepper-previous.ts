import { Directive } from '@angular/core';

import { hostButtonType } from 'forty-cdk/core';
import { injectStepperContext } from './stepper-context';

/**
 * "Previous" button for the stepper. Apply on a `<button>` element. Reflects
 * `aria-disabled="true"` when `canRetreat()` is false (first step reached or
 * root disabled).
 *
 * The directive forces `type="button"` through a host binding, so a consumer
 * `type="submit"` on the host cannot make going back a step submit a
 * surrounding `<form>`.
 *
 * Clicking while `aria-disabled` is a no-op.
 */
@Directive({
  selector: 'button[forStepperPrevious]',
  exportAs: 'forStepperPrevious',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.aria-disabled]': '!ctx.canRetreat() ? "true" : null',
    '(click)': 'onClick()',
  },
})
export class ForStepperPrevious {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectStepperContext('ForStepperPrevious');

  protected onClick(): void {
    this.ctx.previous();
  }
}
