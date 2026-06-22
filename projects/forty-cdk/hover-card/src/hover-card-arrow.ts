import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectHoverCardContext } from './hover-card-context';

/**
 * Arrow pointing from the card back to its trigger. Floating-ui places it
 * along the right edge so the consumer only has to give it a size and a
 * background — no positioning math required.
 */
@Directive({
  selector: '[forHoverCardArrow]',
  exportAs: 'forHoverCardArrow',
  host: {
    'aria-hidden': 'true',
    'data-hover-card-arrow': '',
  },
})
export class ForHoverCardArrow {
  readonly #ctx = injectHoverCardContext('ForHoverCardArrow');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.#ctx.registerArrow(el),
      (el) => this.#ctx.unregisterArrow(el),
    );
  }
}
