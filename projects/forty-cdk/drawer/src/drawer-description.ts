import { Directive } from '@angular/core';

import { registerA11yDescription } from 'forty-cdk/core';
import { injectDrawerContext } from './drawer-context';

/**
 * Convenience: gives the host element a stable id and registers it as the
 * drawer's accessible description (`aria-describedby`). Apply on a `<p>` or
 * other element inside `[forDrawer]`. Optional — only use when there's
 * non-title supporting copy.
 */
@Directive({
  selector: '[forDrawerDescription]',
  exportAs: 'forDrawerDescription',
  host: {
    '[id]': 'id',
  },
})
export class ForDrawerDescription {
  protected readonly id = registerA11yDescription(
    injectDrawerContext('ForDrawerDescription'),
    'for-drawer-description',
  );
}
