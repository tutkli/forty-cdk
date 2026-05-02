import { DestroyRef, Directive, inject, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import { injectPopoverContext } from './popover-context';

/**
 * Convenience: gives the host element a stable id and registers it as the
 * popover's accessible description (`aria-describedby`). Apply on a paragraph
 * or similar text element inside `[forPopoverContent]`.
 */
@Directive({
  selector: '[forPopoverDescription]',
  exportAs: 'forPopoverDescription',
  host: {
    '[id]': 'id()',
  },
})
export class ForPopoverDescription {
  readonly #ctx = injectPopoverContext('ForPopoverDescription');
  readonly #idGen = inject(IdGenerator);

  protected readonly id = signal(this.#idGen.next('for-popover-description'));

  constructor() {
    const myId = this.id();
    this.#ctx.registerDescription(myId);
    inject(DestroyRef).onDestroy(() => this.#ctx.unregisterDescription(myId));
  }
}
