import { DestroyRef, Directive, inject, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator';
import { injectPopoverContext } from './popover-context';

/**
 * Convenience: gives the host element a stable id and registers it as the
 * popover's accessible name (`aria-labelledby`). Apply on a heading element
 * (`<h2>`, `<h3>`...) inside `[forPopoverContent]`.
 *
 * If you don't render a visible title, omit this and pass `ariaLabel` on
 * the popover root instead.
 */
@Directive({
  selector: '[forPopoverTitle]',
  exportAs: 'forPopoverTitle',
  host: {
    '[id]': 'id()',
  },
})
export class ForPopoverTitle {
  readonly #ctx = injectPopoverContext('ForPopoverTitle');
  readonly #idGen = inject(IdGenerator);

  protected readonly id = signal(this.#idGen.next('for-popover-title'));

  constructor() {
    const myId = this.id();
    this.#ctx.registerLabel(myId);
    inject(DestroyRef).onDestroy(() => this.#ctx.unregisterLabel(myId));
  }
}
