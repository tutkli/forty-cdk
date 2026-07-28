import { computed, Directive, input } from '@angular/core';

import { hostButtonType, reflectDisabled, hostAriaLabel } from 'forty-cdk/core';
import { injectPaginationContext } from './pagination-context';

/**
 * Next-page button. Apply on a `<button>` so Enter/Space activation is
 * native. Disabled (via the native `disabled` attribute) when the current page
 * is the last page or the root is disabled. Clicking calls `ctx.next()`.
 */
@Directive({
  selector: '[forPaginationNext]',
  exportAs: 'forPaginationNext',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(click)': 'ctx.next()',
  },
})
export class ForPaginationNext {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectPaginationContext('ForPaginationNext');

  /**
   * Accessible label for this button (e.g. "Next page"). When `null`
   * (default), no `aria-label` is emitted — the consumer should supply a
   * visible label or set this input.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  protected readonly isDisabled = computed(() => this.ctx.isLast() || this.ctx.disabled());

  constructor() {
    reflectDisabled(this.isDisabled);
  }
}
