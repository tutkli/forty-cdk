import { DestroyRef, Directive, inject } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
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
    '[id]': 'id',
  },
})
export class ForToastTitle {
  protected readonly id = inject(IdGenerator).next('for-toast-title');

  constructor() {
    const ctx = injectToastContext('ForToastTitle');
    ctx.registerLabel(this.id);
    inject(DestroyRef).onDestroy(() => ctx.unregisterLabel(this.id));
  }
}
