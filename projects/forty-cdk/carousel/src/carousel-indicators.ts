import { Directive, input } from '@angular/core';

import { injectCarouselContext } from './carousel-context';

/**
 * The slide-picker group (dot navigation). Renders as `role="group"` and
 * should receive an `ariaLabel` describing its purpose (e.g. "Choose slide
 * to display") per the WAI-ARIA APG Carousel pattern.
 *
 * Keyboard navigation (ArrowLeft/Right, Home/End) and automatic activation
 * live on each `[forCarouselIndicator]` child, not on this container.
 */
@Directive({
  selector: '[forCarouselIndicators]',
  exportAs: 'forCarouselIndicators',
  host: {
    role: 'group',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForCarouselIndicators {
  protected readonly ctx = injectCarouselContext('ForCarouselIndicators');

  /**
   * Accessible label for the picker group (e.g. "Choose slide to display").
   * APG recommends labelling the group so screen readers can distinguish it
   * from other landmarks.
   */
  readonly ariaLabel = input<string | null>(null);
}
