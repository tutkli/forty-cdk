import { Directive } from '@angular/core';

import { registerA11yName } from '../_internal/collection/register-handle';
import { injectMenuGroupContext } from './menu-group-context';

/**
 * Accessible name for `[forMenuGroup]`. Generates an id on the host and
 * registers it with the parent group so `aria-labelledby` resolves to
 * this element.
 */
@Directive({
  selector: '[forMenuGroupLabel]',
  host: {
    '[id]': 'id()',
  },
})
export class ForMenuGroupLabel {
  readonly id = registerA11yName(
    injectMenuGroupContext('ForMenuGroupLabel'),
    'for-menu-group-label',
  );
}
