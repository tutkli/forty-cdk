import { afterEveryRender, Directive, ElementRef, inject, signal } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import { injectToastContext, type ForToastTextHandle } from './toast-context';

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
  readonly #ctx = injectToastContext('ForToastTitle');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly id = inject(IdGenerator).next('for-toast-title');
  readonly #text = signal('');

  constructor() {
    const handle: ForToastTextHandle = { id: this.id, text: this.#text.asReadonly() };
    registerHandle(
      handle,
      (h) => this.#ctx.registerLabel(h),
      (h) => this.#ctx.unregisterLabel(h),
    );
    afterEveryRender(() => {
      const next = (this.#host.nativeElement.textContent ?? '').trim();
      if (next !== this.#text()) {
        this.#text.set(next);
      }
    });
  }
}
