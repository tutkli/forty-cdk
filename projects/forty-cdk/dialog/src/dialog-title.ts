import { Directive } from '@angular/core';

import { registerA11yName } from 'forty-cdk/core';
import { injectDialogContext } from './dialog-context';

/**
 * Convenience: gives the host element a stable id and registers it as the
 * dialog's accessible name (`aria-labelledby`). Apply on a heading element
 * (`<h2>`, `<h3>`...) inside `[forDialog]`.
 *
 * If you don't render visible title text, omit this and pass `ariaLabel`
 * on the dialog itself instead.
 */
@Directive({
  selector: '[forDialogTitle]',
  exportAs: 'forDialogTitle',
  host: {
    '[id]': 'id()',
  },
})
export class ForDialogTitle {
  protected readonly id = registerA11yName(
    injectDialogContext('ForDialogTitle'),
    'for-dialog-title',
  );
}
