import { Directive } from '@angular/core';

import { injectStepperContext, injectStepperItemContext } from './stepper-context';

/**
 * Decorative connector between steps. Hidden from the accessibility tree
 * (`aria-hidden="true"`). Reflects `data-state="completed"` when the preceding
 * step is marked completed, `data-state="pending"` otherwise. Also reflects
 * `data-orientation` so consumers can style horizontal vs vertical separators
 * differently.
 *
 * Must be used inside a `[forStepperItem]` element.
 */
@Directive({
  selector: '[forStepperSeparator]',
  exportAs: 'forStepperSeparator',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': "item.completed() ? 'completed' : 'pending'",
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForStepperSeparator {
  protected readonly ctx = injectStepperContext('ForStepperSeparator');
  protected readonly item = injectStepperItemContext('ForStepperSeparator');
}
