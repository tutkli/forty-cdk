import { Directive } from '@angular/core';

import { registerA11yDescription } from '../_internal/collection/register-handle';
import { injectPopoverContext } from './popover-context';

/**
 * Convenience: gives the host element a stable id and registers it as the
 * popover's accessible description (`aria-describedby`). Apply on a paragraph
 * or similar text element inside `[forPopoverContent]`.
 */
@Directive({
  selector: '[forPopoverDescription]',
  exportAs: 'forPopoverDescription',
  host: {
    '[id]': 'id()',
  },
})
export class ForPopoverDescription {
  protected readonly id = registerA11yDescription(
    injectPopoverContext('ForPopoverDescription'),
    'for-popover-description',
  );
}
