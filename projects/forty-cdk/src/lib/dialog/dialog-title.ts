import { DestroyRef, Directive, inject, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator';
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
  readonly #ctx = injectDialogContext('ForDialogTitle');
  readonly #idGen = inject(IdGenerator);

  protected readonly id = signal(this.#idGen.next('for-dialog-title'));

  constructor() {
    const myId = this.id();
    this.#ctx.registerLabel(myId);
    inject(DestroyRef).onDestroy(() => this.#ctx.unregisterLabel(myId));
  }
}
