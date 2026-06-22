import { Directive } from '@angular/core';

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
    '[attr.data-orientation]': 'group.orientation()',
  },
})
export class ForTabsList {
  protected readonly group = injectTabsContext('ForTabsList');
}
