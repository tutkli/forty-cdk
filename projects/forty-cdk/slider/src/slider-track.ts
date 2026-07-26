import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectSliderContext } from './slider-context';

/**
 * The clickable track surface. Registers its element with `ForSlider` so the
 * root's pointer-drag session can map pointer coordinates to a value: a press
 * on bare track jumps the nearest thumb to the clicked position, focuses it,
 * and starts a drag, while a press on a thumb drags that specific thumb.
 *
 * Reflects `data-orientation` and `data-disabled` so consumers can paint
 * the track from CSS. Position the visible track however you want — this
 * directive just owns the bounding-rect for the math.
 */
@Directive({
  selector: '[forSliderTrack]',
  exportAs: 'forSliderTrack',
  host: {
    '[attr.data-orientation]': 'ctx.orientation()',
    '[attr.data-disabled]': 'ctx.effectiveDisabled() ? "" : null',
  },
})
export class ForSliderTrack {
  protected readonly ctx = injectSliderContext('ForSliderTrack');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.ctx.setTrack(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.setTrack(null));
  }
}
