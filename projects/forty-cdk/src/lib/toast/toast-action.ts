import { Directive } from '@angular/core';

import { injectToastContext } from './toast-context';

/**
 * Action button inside a toast (e.g. "Undo"). Apply on a
 * `<button type="button">` so Space / Enter dispatch a native click.
 *
 * Clicking emits `(close)` from the parent `[forToast]` with reason
 * `'action'`. Wire your action handler with `(click)` on this element
 * itself — the close fires after your handler runs (via event order).
 */
@Directive({
  selector: '[forToastAction]',
  exportAs: 'forToastAction',
  host: {
    type: 'button',
    '(click)': 'onClick()',
  },
})
export class ForToastAction {
  protected readonly ctx = injectToastContext('ForToastAction');

  protected onClick(): void {
    this.ctx.requestClose('action');
  }
}
