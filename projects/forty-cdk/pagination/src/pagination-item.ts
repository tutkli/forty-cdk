import { booleanAttribute, computed, Directive, input } from '@angular/core';

import { reflectDisabled } from 'forty-cdk/core';
import { injectPaginationContext } from './pagination-context';

/**
 * Page number button. Apply on a `<button>` so Enter/Space activation is
 * native. Reflects `aria-current="page"` when this button represents the
 * currently active page. Clicking calls `ctx.goToPage(page)`.
 */
@Directive({
  selector: '[forPaginationItem]',
  exportAs: 'forPaginationItem',
  host: {
    type: 'button',
    '[attr.aria-current]': 'isCurrent() ? "page" : null',
    '(click)': 'activate()',
  },
})
export class ForPaginationItem {
  protected readonly ctx = injectPaginationContext('ForPaginationItem');

  /** The 1-based page number this button navigates to. */
  readonly page = input.required<number>();

  /** Per-item disabled override (in addition to the root's `disabled`). */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Whether this item is effectively disabled (own or root disabled). */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx.disabled());

  /** Whether this button represents the currently active page. */
  readonly isCurrent = computed(() => this.ctx.page() === this.page());

  constructor() {
    reflectDisabled(this.effectiveDisabled);
  }

  protected activate(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.ctx.goToPage(this.page());
  }
}
