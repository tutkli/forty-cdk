import { Directive } from '@angular/core';

import { registerA11yName } from 'forty-cdk/core';
import { injectDrawerContext } from './drawer-context';

/**
 * Convenience: gives the host element a stable id and registers it as the
 * drawer's accessible name (`aria-labelledby`). Apply on a heading element
 * (`<h2>`, `<h3>`...) inside `[forDrawer]`.
 *
 * If you don't render visible title text, omit this and pass `ariaLabel`
 * on the drawer root instead.
 */
@Directive({
  selector: '[forDrawerTitle]',
  exportAs: 'forDrawerTitle',
  host: {
    '[id]': 'id',
  },
})
export class ForDrawerTitle {
  protected readonly id = registerA11yName(
    injectDrawerContext('ForDrawerTitle'),
    'for-drawer-title',
  );
}
