import { Directive } from '@angular/core';

import { hostButtonType } from 'forty-cdk/core';
import { injectStepperContext } from './stepper-context';

/**
 * "Next" button for the stepper. Apply on a `<button>` element. Reflects
 * `aria-disabled="true"` when `canAdvance()` is false (last step reached, root
 * disabled, or in linear mode the current step is not completed / optional).
 *
 * The directive forces `type="button"` through a host binding, so a consumer
 * `type="submit"` on the host cannot make advancing a step submit a surrounding
 * `<form>`.
 *
 * Clicking while `aria-disabled` is a no-op.
 */
@Directive({
  selector: 'button[forStepperNext]',
  exportAs: 'forStepperNext',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.aria-disabled]': '!ctx.canAdvance() ? "true" : null',
    '(click)': 'onClick()',
  },
})
export class ForStepperNext {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectStepperContext('ForStepperNext');

  protected onClick(): void {
    this.ctx.next();
  }
}
