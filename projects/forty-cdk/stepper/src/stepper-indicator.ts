import { Directive } from '@angular/core';

import { injectStepperItemContext } from './stepper-context';

/**
 * Decorative icon slot for a step. Hidden from the accessibility tree
 * (`aria-hidden="true"`). Reflects the step's resolved `data-state` so
 * consumers can swap icons via CSS `[data-state="completed"]`,
 * `[data-state="error"]`, etc., or with `@if` keyed on the exported
 * `#indicator="forStepperIndicator"` reference.
 *
 * Must be used inside a `[forStepperItem]` element.
 */
@Directive({
  selector: '[forStepperIndicator]',
  exportAs: 'forStepperIndicator',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'item.resolvedState()',
  },
})
export class ForStepperIndicator {
  protected readonly item = injectStepperItemContext('ForStepperIndicator');
}
