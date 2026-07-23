import { computed, Directive, input } from '@angular/core';

import { reflectDisabled } from 'forty-cdk/core';
import { injectPaginationContext } from './pagination-context';

/**
 * Previous-page button. Apply on a `<button>` so Enter/Space activation is
 * native. Disabled (via the native `disabled` attribute) when the current page
 * is the first page or the root is disabled. Clicking calls `ctx.previous()`.
 */
@Directive({
  selector: '[forPaginationPrevious]',
  exportAs: 'forPaginationPrevious',
  host: {
    type: 'button',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(click)': 'ctx.previous()',
  },
})
export class ForPaginationPrevious {
  protected readonly ctx = injectPaginationContext('ForPaginationPrevious');

  /**
   * Accessible label for this button (e.g. "Previous page"). When `null`
   * (default), no `aria-label` is emitted — the consumer should supply a
   * visible label or set this input.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly isDisabled = computed(() => this.ctx.isFirst() || this.ctx.disabled());

  constructor() {
    reflectDisabled(this.isDisabled);
  }
}
