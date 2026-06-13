import { Directive, ElementRef, inject } from '@angular/core';

import { hostId } from '../_internal/host-id/host-id';
import { injectCarouselContext } from './carousel-context';

/**
 * Clips the visible window of the carousel track. Acts as the APG-mandated
 * live region for screen-reader announcements. `aria-live` flips between
 * `"off"` while the carousel is actively auto-rotating (so advancing slides
 * do not bombard the screen reader) and `"polite"` at all other times so
 * manual navigation is announced. Also serves as the `aria-controls` target
 * for the prev/next buttons.
 *
 * Registers itself with the carousel root on construction so the root's
 * `injectElementSize` observer starts and prev/next's `aria-controls` resolves.
 * There must be exactly one viewport per carousel.
 */
@Directive({
  selector: '[forCarouselViewport]',
  exportAs: 'forCarouselViewport',
  host: {
    '[id]': 'id()',
    'aria-atomic': 'false',
    '[attr.aria-live]': 'ctx.rotating() ? "off" : "polite"',
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForCarouselViewport {
  protected readonly ctx = injectCarouselContext('ForCarouselViewport');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The resolved id of this element — generated or adopted from a consumer-set static `id`. */
  readonly id = hostId('for-carousel-viewport');

  constructor() {
    this.ctx.setViewport(this.#host.nativeElement, this.id());
  }
}
