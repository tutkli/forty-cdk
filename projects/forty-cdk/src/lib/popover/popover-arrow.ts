import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

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
    this.#ctx.registerArrow(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() =>
      this.#ctx.unregisterArrow(this.#host.nativeElement),
    );
  }
}
