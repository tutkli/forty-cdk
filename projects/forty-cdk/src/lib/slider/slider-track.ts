import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectSliderContext } from './slider-context';

/**
 * The clickable track surface. PointerDown anywhere on the track that isn't
 * a thumb finds the nearest thumb, jumps it to the clicked position, focuses
 * it, and starts a drag (so the user can keep refining without releasing).
 *
 * Thumbs handle their own pointerdown, so a click directly on a thumb
 * skips the "nearest" lookup and drags that specific thumb.
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
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class ForSliderTrack {
  protected readonly ctx = injectSliderContext('ForSliderTrack');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.ctx.setTrack(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.setTrack(null));
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.ctx.disabled() || this.ctx.readonly()) {
      return;
    }
    // Only react to primary button / touch / pen contact.
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    // Direct thumb clicks are handled by the thumb's own listener; the thumb
    // calls `stopPropagation()` so we don't double-handle.
    event.preventDefault();
    const target = this.ctx.pointerToValue(event.clientX, event.clientY);
    const index = this.ctx.nearestThumbIndex(target);
    if (index < 0) {
      return;
    }
    this.ctx.setValueAt(index, target);
    this.ctx.beginDrag(index, event);
  }
}
