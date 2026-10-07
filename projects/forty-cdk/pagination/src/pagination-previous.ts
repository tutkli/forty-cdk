import { computed, Directive, input } from '@angular/core';

import { hostButtonType, hostAriaLabel } from 'forty-cdk/core';
import { injectPaginationContext } from './pagination-context';

/**
 * Previous-page button. Apply on a `<button>` so Enter/Space activation is
 * native. Disabled when the current page is the first page or the root is
 * disabled. Clicking calls `ctx.previous()`.
 *
 * Reflects the disabled state through `aria-disabled` + `data-disabled` only —
 * never the native `disabled` attribute — so a button that auto-disables at the
 * first page while focused keeps DOM focus instead of being ejected from the
 * focus order. Activation is a no-op while disabled.
 */
@Directive({
  selector: '[forPaginationPrevious]',
  exportAs: 'forPaginationPrevious',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(click)': 'activate()',
  },
})
export class ForPaginationPrevious {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectPaginationContext('ForPaginationPrevious');

  /**
   * Accessible label for this button (e.g. "Previous page"). When `null`
   * (default), no `aria-label` is emitted — the consumer should supply a
   * visible label or set this input.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  protected readonly isDisabled = computed(() => this.ctx.isFirst() || this.ctx.disabled());

  protected activate(): void {
    if (this.isDisabled()) {
      return;
    }
    this.ctx.previous();
  }
}
