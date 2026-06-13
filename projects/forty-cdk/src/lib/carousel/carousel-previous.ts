import { computed, Directive, input } from '@angular/core';

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { injectCarouselContext } from './carousel-context';

/**
 * Previous-slide button. Apply on a `<button>` so Enter/Space activation is
 * native. Disabled (via the native `disabled` attribute) at index 0 when the
 * carousel is not looping. When `loop` is `true` it is never disabled.
 *
 * Points `aria-controls` at the viewport's id so screen readers announce the
 * relationship. Clicking does not move focus (APG).
 */
@Directive({
  selector: '[forCarouselPrevious]',
  exportAs: 'forCarouselPrevious',
  host: {
    type: 'button',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-controls]': 'ctx.viewportId()',
    '(click)': 'ctx.scrollPrev()',
  },
})
export class ForCarouselPrevious {
  protected readonly ctx = injectCarouselContext('ForCarouselPrevious');

  /**
   * Accessible label for this button (e.g. "Previous slide"). When `null`
   * (default), no `aria-label` is emitted — the consumer should supply a
   * visible label or set this input.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly isDisabled = computed(() => !this.ctx.canScrollPrev());

  constructor() {
    reflectDisabled(this.isDisabled);
  }
}
