import { computed, Directive, input } from '@angular/core';

import { injectCarouselContext } from './carousel-context';

/**
 * Play/pause control for carousel auto-rotation. Apply on a `<button>` so
 * Enter/Space activation is native. Its accessible name swaps with the
 * rotation state — `stopLabel` while rotating, `startLabel` while stopped —
 * per the WAI-ARIA APG Carousel pattern, which forbids `aria-pressed` here.
 *
 * Place this control **first** in the carousel's DOM/tab order so assistive
 * technology users meet it before the rotating content (APG requirement).
 *
 * Reflects a boolean `data-playing` attribute (present while rotation is on)
 * as the styling hook for swapping a play/pause icon.
 */
@Directive({
  selector: '[forCarouselRotationControl]',
  exportAs: 'forCarouselRotationControl',
  host: {
    type: 'button',
    '[attr.aria-label]': 'label()',
    '[attr.data-playing]': 'ctx.playing() ? "" : null',
    '(click)': 'ctx.toggleAutoplay()',
  },
})
export class ForCarouselRotationControl {
  protected readonly ctx = injectCarouselContext('ForCarouselRotationControl');

  /** Accessible name shown while rotation is **stopped** (the button will start it). */
  readonly startLabel = input('Start automatic slide show');

  /** Accessible name shown while rotation is **playing** (the button will stop it). */
  readonly stopLabel = input('Stop automatic slide show');

  /** The current accessible name — `stopLabel` while playing, else `startLabel`. */
  protected readonly label = computed(() =>
    this.ctx.playing() ? this.stopLabel() : this.startLabel(),
  );
}
