import { Directive } from '@angular/core';

import { registerA11yName } from '../_internal/collection/register-handle';
import { injectToastContext } from './toast-context';

/**
 * Element holding the toast's accessible name. Registers its generated id
 * with the parent `[forToast]` so `aria-labelledby` is wired automatically.
 * Apply on whatever heading element fits (`<strong>`, `<h2>`, `<div>`).
 */
@Directive({
  selector: '[forToastTitle]',
  exportAs: 'forToastTitle',
  host: {
    '[id]': 'id()',
  },
})
export class ForToastTitle {
  protected readonly id = registerA11yName(injectToastContext('ForToastTitle'), 'for-toast-title');
}
