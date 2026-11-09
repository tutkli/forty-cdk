import { Directive } from '@angular/core';

import { hostButtonType } from 'forty-cdk/core';
import { injectStepperContext } from './stepper-context';

/**
 * "Next" button for the stepper. Apply on a `<button>` element. Moves to the nearest later step
 * that is not disabled, or into the terminal completed state when none remains. Reflects
 * `aria-disabled="true"` + `data-disabled` when `canAdvance()` is false (terminal state reached,
 * root disabled, or every later target disabled or, in linear mode, unreachable).
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
    '[attr.data-disabled]': '!ctx.canAdvance() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class ForStepperNext {
  private readonly buttonType = hostButtonType();

  private readonly ctx = injectStepperContext('ForStepperNext');

  private onClick(): void {
    this.ctx.next();
  }
}
