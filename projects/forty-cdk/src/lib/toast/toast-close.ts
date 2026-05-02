import { Directive } from '@angular/core';

import { injectToastContext } from './toast-context';

/**
 * Close button inside a toast. Apply on a `<button type="button">` so
 * Space / Enter dispatch a native click. Clicking emits `(close)` from
 * the parent `[forToast]` with reason `'manual'`.
 *
 * The host carries `aria-label="Close"` by default; override with your
 * own `[attr.aria-label]` when the toast's language requires localization.
 */
@Directive({
  selector: '[forToastClose]',
  exportAs: 'forToastClose',
  host: {
    type: 'button',
    'aria-label': 'Close',
    '(click)': 'onClick()',
  },
})
export class ForToastClose {
  protected readonly ctx = injectToastContext('ForToastClose');

  protected onClick(): void {
    this.ctx.requestClose('manual');
  }
}
