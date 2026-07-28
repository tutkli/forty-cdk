import { computed, Directive, input } from '@angular/core';

import { hostButtonType, hostAriaLabel } from 'forty-cdk/core';
import { injectCarouselContext } from './carousel-context';

/**
 * Next-slide button. Apply on a `<button>` so Enter/Space activation is
 * native. Disabled at the last index when the carousel is not looping; when
 * `loop` is `true` it is never disabled.
 *
 * Reflects the disabled state through `aria-disabled` + `data-disabled` only —
 * never the native `disabled` attribute — so a button that auto-disables at the
 * last slide while focused keeps DOM focus instead of being ejected from the
 * focus order. Activation is a no-op while disabled.
 *
 * Points `aria-controls` at the viewport's id so screen readers announce the
 * relationship. Clicking does not move focus (APG).
 */
@Directive({
  selector: '[forCarouselNext]',
  exportAs: 'forCarouselNext',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-controls]': 'ctx.viewportId()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(click)': 'activate()',
  },
})
export class ForCarouselNext {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectCarouselContext('ForCarouselNext');

  /**
   * Accessible label for this button (e.g. "Next slide"). When `null`
   * (default), no `aria-label` is emitted — the consumer should supply a
   * visible label or set this input.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  protected readonly isDisabled = computed(() => !this.ctx.canScrollNext());

  protected activate(): void {
    if (this.isDisabled()) {
      return;
    }
    this.ctx.scrollNext();
  }
}
