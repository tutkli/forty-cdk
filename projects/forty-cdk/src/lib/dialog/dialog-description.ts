import { Directive } from '@angular/core';

import { registerA11yDescription } from '../_internal/collection/register-handle';
import { injectDialogContext } from './dialog-context';

/**
 * Convenience: gives the host element a stable id and registers it as the
 * dialog's accessible description (`aria-describedby`). Apply on a `<p>` or
 * other element inside `[forDialog]`. Optional — only use when there's
 * non-title supporting copy (the question of a confirm, the rationale of
 * an alert).
 */
@Directive({
  selector: '[forDialogDescription]',
  exportAs: 'forDialogDescription',
  host: {
    '[id]': 'id()',
  },
})
export class ForDialogDescription {
  protected readonly id = registerA11yDescription(
    injectDialogContext('ForDialogDescription'),
    'for-dialog-description',
  );
}
