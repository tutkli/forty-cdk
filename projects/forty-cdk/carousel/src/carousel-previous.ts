import { computed, Directive, input } from '@angular/core';

import { hostAriaLabel } from 'forty-cdk/core';
import { injectCarouselContext } from './carousel-context';

/**
 * Previous-slide button. Apply on a `<button>` so Enter/Space activation is
 * native. Disabled at index 0 when the carousel is not looping; when `loop` is
 * `true` it is never disabled.
 *
 * Reflects the disabled state through `aria-disabled` + `data-disabled` only —
 * never the native `disabled` attribute — so a button that auto-disables at
 * index 0 while focused keeps DOM focus instead of being ejected from the focus
 * order. Activation is a no-op while disabled.
 *
 * Points `aria-controls` at the viewport's id so screen readers announce the
 * relationship. Clicking does not move focus (APG).
 */
@Directive({
  selector: '[forCarouselPrevious]',
  exportAs: 'forCarouselPrevious',
  host: {
    type: 'button',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-controls]': 'ctx.viewportId()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(click)': 'activate()',
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

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  protected readonly isDisabled = computed(() => !this.ctx.canScrollPrev());

  protected activate(): void {
    if (this.isDisabled()) {
      return;
    }
    this.ctx.scrollPrev();
  }
}
