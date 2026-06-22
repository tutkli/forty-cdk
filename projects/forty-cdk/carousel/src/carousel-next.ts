import { computed, Directive, input } from '@angular/core';

import { reflectDisabled } from 'forty-cdk/core';
import { injectCarouselContext } from './carousel-context';

/**
 * Next-slide button. Apply on a `<button>` so Enter/Space activation is
 * native. Disabled (via the native `disabled` attribute) at the last index
 * when the carousel is not looping. When `loop` is `true` it is never disabled.
 *
 * Points `aria-controls` at the viewport's id so screen readers announce the
 * relationship. Clicking does not move focus (APG).
 */
@Directive({
  selector: '[forCarouselNext]',
  exportAs: 'forCarouselNext',
  host: {
    type: 'button',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-controls]': 'ctx.viewportId()',
    '(click)': 'ctx.scrollNext()',
  },
})
export class ForCarouselNext {
  protected readonly ctx = injectCarouselContext('ForCarouselNext');

  /**
   * Accessible label for this button (e.g. "Next slide"). When `null`
   * (default), no `aria-label` is emitted — the consumer should supply a
   * visible label or set this input.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly isDisabled = computed(() => !this.ctx.canScrollNext());

  constructor() {
    reflectDisabled(this.isDisabled);
  }
}
