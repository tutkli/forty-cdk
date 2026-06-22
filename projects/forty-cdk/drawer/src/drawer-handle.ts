import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectDrawerContext } from './drawer-context';

/**
 * Visual swipe handle (the "grabber" pill at the top of a bottom sheet).
 * Registers itself with the drawer so that `[handleOnly]="true"` can scope
 * the swipe gesture to gestures starting on this element. Reflects
 * `aria-hidden="true"` because the handle is a decorative styling target —
 * keyboard users dismiss via Escape / a `[forDrawerClose]` button.
 *
 * Apply on the visual handle element. Applies no styles itself; the
 * consumer is responsible for sizing, positioning, and color.
 */
@Directive({
  selector: '[forDrawerHandle]',
  exportAs: 'forDrawerHandle',
  host: {
    'aria-hidden': 'true',
    'data-for-drawer-handle': '',
  },
})
export class ForDrawerHandle {
  readonly #ctx = injectDrawerContext('ForDrawerHandle');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.#ctx.registerHandle(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.#ctx.registerHandle(null));
  }
}
