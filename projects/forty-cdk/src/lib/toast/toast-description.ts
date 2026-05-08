import { Directive } from '@angular/core';

import { registerA11yDescription } from '../_internal/collection/register-handle';
import { injectToastContext } from './toast-context';

/**
 * Supplementary description for the toast. Registers its generated id
 * with the parent `[forToast]` so `aria-describedby` is wired automatically.
 */
@Directive({
  selector: '[forToastDescription]',
  exportAs: 'forToastDescription',
  host: {
    '[id]': 'id()',
  },
})
export class ForToastDescription {
  protected readonly id = registerA11yDescription(
    injectToastContext('ForToastDescription'),
    'for-toast-description',
  );
}
