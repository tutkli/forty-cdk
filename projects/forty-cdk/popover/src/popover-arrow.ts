import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectPopoverContext } from './popover-context';

/**
 * Optional visual arrow inside `ForPopoverContent`. Registers itself with
 * the popover context so floating-ui's `arrow` middleware can position it
 * along the surface edge that points at the trigger. Style size and color
 * yourself — the directive only sets `position`, `left`/`top`, and the
 * opposite-side offset.
 */
@Directive({
  selector: '[forPopoverArrow]',
  exportAs: 'forPopoverArrow',
  host: {
    'aria-hidden': 'true',
    'data-popover-arrow': '',
  },
})
export class ForPopoverArrow {
  readonly #ctx = injectPopoverContext('ForPopoverArrow');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.#ctx.registerArrow(el),
      (el) => this.#ctx.unregisterArrow(el),
    );
  }
}
