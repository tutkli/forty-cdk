import { DestroyRef, Directive, inject, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import { injectMenuGroupContext } from './menu-group-context';

/**
 * Accessible name for `[forMenuGroup]`. Generates an id on the host and
 * registers it with the parent group so `aria-labelledby` resolves to
 * this element.
 */
@Directive({
  selector: '[forMenuGroupLabel]',
  host: {
    '[id]': 'id()',
  },
})
export class ForMenuGroupLabel {
  readonly #idGen = inject(IdGenerator);
  readonly id = signal(this.#idGen.next('for-menu-group-label'));

  constructor() {
    const group = injectMenuGroupContext('ForMenuGroupLabel');
    const id = this.id();
    group.registerLabel(id);
    inject(DestroyRef).onDestroy(() => group.unregisterLabel(id));
  }
}
