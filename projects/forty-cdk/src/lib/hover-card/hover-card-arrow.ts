import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectHoverCardContext } from './hover-card-context';

/**
 * Arrow pointing from the card back to its trigger. Floating-ui places it
 * along the right edge so the consumer only has to give it a size and a
 * background — no positioning math required.
 */
@Directive({
  selector: '[forHoverCardArrow]',
  exportAs: 'forHoverCardArrow',
})
export class ForHoverCardArrow {
  readonly #ctx = injectHoverCardContext('ForHoverCardArrow');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.#ctx.registerArrow(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() =>
      this.#ctx.unregisterArrow(this.#host.nativeElement),
    );
  }
}
