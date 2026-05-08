import { Directive } from '@angular/core';

import { registerA11yName } from '../_internal/collection/register-handle';
import { injectPopoverContext } from './popover-context';

/**
 * Convenience: gives the host element a stable id and registers it as the
 * popover's accessible name (`aria-labelledby`). Apply on a heading element
 * (`<h2>`, `<h3>`...) inside `[forPopoverContent]`.
 *
 * If you don't render a visible title, omit this and pass `ariaLabel` on
 * the popover root instead.
 */
@Directive({
  selector: '[forPopoverTitle]',
  exportAs: 'forPopoverTitle',
  host: {
    '[id]': 'id()',
  },
})
export class ForPopoverTitle {
  protected readonly id = registerA11yName(
    injectPopoverContext('ForPopoverTitle'),
    'for-popover-title',
  );
}
