import { Directive, inject, type Signal } from '@angular/core';

import { registerA11yName } from 'forty-cdk/core';
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
  /** Stable host id used by the parent group's `aria-labelledby`. */
  readonly id: Signal<string>;

  constructor() {
    const group = inject(ForListboxGroup, { optional: true });
    if (!group) {
      throw new Error(
        '[forty-cdk/listbox] ForListboxGroupLabel must be used inside a [forListboxGroup] element.',
      );
    }
    this.id = registerA11yName(group, 'for-listbox-group-label');
  }
}
