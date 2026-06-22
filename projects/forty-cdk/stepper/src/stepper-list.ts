import { Directive, input } from '@angular/core';

import { injectStepperContext } from './stepper-context';

/**
 * The step-list container. In `mode="interactive"` renders as `role="tablist"`
 * with `aria-orientation`; in `mode="progress"` renders as `role="list"`.
 *
 * Apply on an `<ol>` (recommended for semantic list markup) wrapping the
 * `[forStepperItem]` elements. The `[forStepperContent]` panels live as
 * siblings of the list.
 */
@Directive({
  selector: '[forStepperList]',
  exportAs: 'forStepperList',
  host: {
    '[attr.role]': "ctx.mode() === 'interactive' ? 'tablist' : 'list'",
    '[attr.aria-orientation]': "ctx.mode() === 'interactive' ? ctx.orientation() : null",
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForStepperList {
  protected readonly ctx = injectStepperContext('ForStepperList');

  /** Accessible name for the step list. Defers to a consumer `aria-labelledby`. */
  readonly ariaLabel = input<string | null>(null);
}
