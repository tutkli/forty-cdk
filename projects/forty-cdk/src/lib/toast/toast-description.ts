import { DestroyRef, Directive, inject } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import { injectToastContext } from './toast-context';

/**
 * Supplementary description for the toast. Registers its generated id
 * with the parent `[forToast]` so `aria-describedby` is wired automatically.
 */
@Directive({
  selector: '[forToastDescription]',
  exportAs: 'forToastDescription',
  host: {
    '[id]': 'id',
  },
})
export class ForToastDescription {
  protected readonly id = inject(IdGenerator).next('for-toast-description');

  constructor() {
    const ctx = injectToastContext('ForToastDescription');
    ctx.registerDescription(this.id);
    inject(DestroyRef).onDestroy(() => ctx.unregisterDescription(this.id));
  }
}
