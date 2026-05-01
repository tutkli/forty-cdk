import { DestroyRef, Directive, inject, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator';
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
  readonly #ctx = injectDialogContext('ForDialogDescription');
  readonly #idGen = inject(IdGenerator);

  protected readonly id = signal(this.#idGen.next('for-dialog-description'));

  constructor() {
    const myId = this.id();
    this.#ctx.registerDescription(myId);
    inject(DestroyRef).onDestroy(() => this.#ctx.unregisterDescription(myId));
  }
}
