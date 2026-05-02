import { DestroyRef, Directive, inject, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator';
import { ForListboxGroup } from './listbox-group';

/**
 * Visible label for a `ForListboxGroup`. Generates a stable id and
 * registers with its parent group so the group's `aria-labelledby` points
 * at this element. Apply on whatever heading element fits the design
 * (often `<div>` styled as a small caption — `<h3>`/`<h4>` if the
 * surrounding document has a sensible heading hierarchy).
 */
@Directive({
  selector: '[forListboxGroupLabel]',
  exportAs: 'forListboxGroupLabel',
  host: {
    '[id]': 'id()',
  },
})
export class ForListboxGroupLabel {
  readonly #idGen = inject(IdGenerator);

  /** Stable host id used by the parent group's `aria-labelledby`. */
  readonly id = signal(this.#idGen.next('for-listbox-group-label'));

  constructor() {
    const group = inject(ForListboxGroup, { optional: true });
    if (!group) {
      throw new Error(
        '[forty-cdk/listbox] ForListboxGroupLabel must be used inside a [forListboxGroup] element.',
      );
    }
    const myId = this.id();
    group.registerLabel(myId);
    inject(DestroyRef).onDestroy(() => group.unregisterLabel(myId));
  }
}
