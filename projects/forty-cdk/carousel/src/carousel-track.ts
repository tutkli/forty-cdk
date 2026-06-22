import { Directive } from '@angular/core';

import { injectCarouselContext } from './carousel-context';

/**
 * The flex container of slides. The consumer's CSS reads
 * `--for-carousel-offset` (inherited from the root) and applies it as a
 * `transform: translateX(...)` / `translateY(...)` on this element.
 * The directive adds no animation or transform itself.
 *
 * Reflects `data-orientation` so the consumer can select the correct CSS
 * axis via `[data-orientation="vertical"] [forCarouselTrack] { ... }`.
 */
@Directive({
  selector: '[forCarouselTrack]',
  exportAs: 'forCarouselTrack',
  host: {
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForCarouselTrack {
  protected readonly ctx = injectCarouselContext('ForCarouselTrack');
}
