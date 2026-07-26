import { Directive, input } from '@angular/core';

import { hostAriaLabel } from 'forty-cdk/core';

import { injectTabsContext } from './tabs-context';

/**
 * The `role="tablist"` container — wraps the `ForTabsTrigger` elements (and
 * only those — panels live as siblings of the list). Reflects the parent's
 * orientation as `aria-orientation`.
 */
@Directive({
  selector: '[forTabsList]',
  exportAs: 'forTabsList',
  host: {
    role: 'tablist',
    '[attr.aria-orientation]': 'group.orientation()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.data-orientation]': 'group.orientation()',
  },
})
export class ForTabsList {
  protected readonly group = injectTabsContext('ForTabsList');

  /** Accessible name for the tab list. Defers to a consumer `aria-labelledby`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);
}
