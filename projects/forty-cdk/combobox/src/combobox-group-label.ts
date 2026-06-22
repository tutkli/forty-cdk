import { Directive, inject, type Signal } from '@angular/core';

import { registerA11yName } from 'forty-cdk/core';
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
  /** Stable host id used by the parent group's `aria-labelledby`. */
  readonly id: Signal<string>;

  constructor() {
    const group = inject(ForComboboxGroup, { optional: true });
    if (!group) {
      throw new Error(
        '[forty-cdk/combobox] ForComboboxGroupLabel must be used inside a [forComboboxGroup] element.',
      );
    }
    this.id = registerA11yName(group, 'for-combobox-group-label');
  }
}
