import { afterEveryRender, Directive, ElementRef, inject, signal } from '@angular/core';

import { registerHandle, resolveHostId } from 'forty-cdk/core';
import { injectToastContext, type ForToastTextHandle } from './toast-context';

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
  readonly #ctx = injectToastContext('ForToastDescription');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly id = resolveHostId(this.#host.nativeElement, 'for-toast-description');
  readonly #text = signal('');

  constructor() {
    const handle: ForToastTextHandle = { id: this.id, text: this.#text.asReadonly() };
    registerHandle(
      handle,
      (h) => this.#ctx.registerDescription(h),
      (h) => this.#ctx.unregisterDescription(h),
    );
    afterEveryRender(() => {
      const next = (this.#host.nativeElement.textContent ?? '').trim();
      if (next !== this.#text()) {
        this.#text.set(next);
      }
    });
  }
}
