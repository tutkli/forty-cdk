import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectTooltipContext } from './tooltip-context';

/**
 * Optional visual arrow inside `ForTooltipContent`. Registers itself with
 * the tooltip context so floating-ui's `arrow` middleware can position it
 * along the bubble edge that points at the trigger. Style size and color
 * yourself — the directive only sets `position`, `left`/`top`, and the
 * opposite-side offset.
 */
@Directive({
  selector: '[forTooltipArrow]',
  exportAs: 'forTooltipArrow',
  host: {
    'aria-hidden': 'true',
    'data-tooltip-arrow': '',
  },
})
export class ForTooltipArrow {
  readonly #ctx = injectTooltipContext('ForTooltipArrow');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.#ctx.registerArrow(el),
      (el) => this.#ctx.unregisterArrow(el),
    );
  }
}
