import { computed, Directive, inject, input } from '@angular/core';

import { injectCarouselContext } from './carousel-context';
import { FOR_CAROUSEL_DEFAULTS } from './carousel-defaults';

/**
 * Play/pause control for carousel auto-rotation. Apply on a `<button>` so
 * Enter/Space activation is native. Its accessible name swaps with the
 * rotation state — `stopLabel` while rotating, `startLabel` while stopped —
 * per the WAI-ARIA APG Carousel pattern, which forbids `aria-pressed` here.
 * Both labels default to the scope's `rotationStopLabel` / `rotationStartLabel`
 * (`provideForCarouselDefaults`), so they can be localized centrally.
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
  readonly #defaults = inject(FOR_CAROUSEL_DEFAULTS);

  /**
   * Accessible name shown while rotation is **stopped** (the button will start
   * it). Defaults to the scope's `rotationStartLabel` (`'Start automatic slide
   * show'` unless overridden via `provideForCarouselDefaults`); set `null` to
   * drop `aria-label` when the button already carries a visible text label.
   */
  readonly startLabel = input<string | null>(this.#defaults.rotationStartLabel);

  /**
   * Accessible name shown while rotation is **playing** (the button will stop
   * it). Defaults to the scope's `rotationStopLabel` (`'Stop automatic slide
   * show'` unless overridden via `provideForCarouselDefaults`); set `null` to
   * drop `aria-label` when the button already carries a visible text label.
   */
  readonly stopLabel = input<string | null>(this.#defaults.rotationStopLabel);

  /** The current accessible name — `stopLabel` while playing, else `startLabel`. */
  protected readonly label = computed(
    () => (this.ctx.playing() ? this.stopLabel() : this.startLabel()) || null,
  );
}
