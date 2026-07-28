import { Directive } from '@angular/core';

import { hostButtonType } from 'forty-cdk/core';
import { injectToastContext } from './toast-context';

/**
 * Close button inside a toast. Apply on a `<button type="button">` so
 * Space / Enter dispatch a native click. Clicking emits `(dismiss)` from
 * the parent `[forToast]` with reason `'manual'`.
 *
 * The host carries `aria-label="Close"` by default; override with your
 * own `[attr.aria-label]` when the toast's language requires localization.
 */
@Directive({
  selector: '[forToastClose]',
  exportAs: 'forToastClose',
  host: {
    '[attr.type]': 'buttonType()',
    'aria-label': 'Close',
    '(click)': 'onClick()',
  },
})
export class ForToastClose {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectToastContext('ForToastClose');

  protected onClick(): void {
    this.ctx.requestClose('manual');
  }
}
