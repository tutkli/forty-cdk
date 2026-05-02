import { DestroyRef, Directive, inject, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import { ForComboboxGroup } from './combobox-group';

/**
 * Visible label for a `[forComboboxGroup]`. Generates a stable id and
 * registers with its parent group so the group's `aria-labelledby` points
 * at this element.
 */
@Directive({
  selector: '[forComboboxGroupLabel]',
  exportAs: 'forComboboxGroupLabel',
  host: {
    '[id]': 'id()',
  },
})
export class ForComboboxGroupLabel {
  readonly #idGen = inject(IdGenerator);

  /** Stable host id used by the parent group's `aria-labelledby`. */
  readonly id = signal(this.#idGen.next('for-combobox-group-label'));

  constructor() {
    const group = inject(ForComboboxGroup, { optional: true });
    if (!group) {
      throw new Error(
        '[forty-cdk/combobox] ForComboboxGroupLabel must be used inside a [forComboboxGroup] element.',
      );
    }
    const myId = this.id();
    group.registerLabel(myId);
    inject(DestroyRef).onDestroy(() => group.unregisterLabel(myId));
  }
}
