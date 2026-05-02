import { DestroyRef, Directive, inject, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import { ForSelectGroup } from './select-group';

/**
 * Visible label for a `[forSelectGroup]`. Generates a stable id and
 * registers with its parent group so the group's `aria-labelledby` points
 * at this element. Apply on whatever heading element fits the design
 * (often `<div>` styled as a small caption).
 */
@Directive({
  selector: '[forSelectGroupLabel]',
  exportAs: 'forSelectGroupLabel',
  host: {
    '[id]': 'id()',
  },
})
export class ForSelectGroupLabel {
  readonly #idGen = inject(IdGenerator);

  /** Stable host id used by the parent group's `aria-labelledby`. */
  readonly id = signal(this.#idGen.next('for-select-group-label'));

  constructor() {
    const group = inject(ForSelectGroup, { optional: true });
    if (!group) {
      throw new Error(
        '[forty-cdk/select] ForSelectGroupLabel must be used inside a [forSelectGroup] element.',
      );
    }
    const myId = this.id();
    group.registerLabel(myId);
    inject(DestroyRef).onDestroy(() => group.unregisterLabel(myId));
  }
}
