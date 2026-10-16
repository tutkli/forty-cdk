import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectSliderContext, sliderTouchAction } from './slider-context';

/**
 * The clickable track surface. Registers its element with `ForSlider` so the
 * root's pointer-drag session can map pointer coordinates to a value: a press
 * on bare track jumps the nearest thumb to the clicked position, focuses it,
 * and starts a drag, while a press on a thumb drags that specific thumb.
 *
 * Reflects `data-orientation` and `data-disabled` so consumers can paint
 * the track from CSS. Position the visible track however you want — this
 * directive just owns the bounding-rect for the math. Binds the same
 * axis-capturing `touch-action` as `[forSliderThumb]`, so a touch drag started
 * on the bare track survives finger drift across the page's scroll axis.
 */
@Directive({
  selector: '[forSliderTrack]',
  exportAs: 'forSliderTrack',
  host: {
    '[attr.data-orientation]': 'ctx.orientation()',
    '[attr.data-disabled]': 'ctx.effectiveDisabled() ? "" : null',
    '[style.touch-action]': 'touchAction()',
  },
})
export class ForSliderTrack {
  private readonly ctx = injectSliderContext('ForSliderTrack');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly touchAction = sliderTouchAction(this.ctx);

  constructor() {
    this.ctx.setTrack(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.setTrack(null));
  }
}
