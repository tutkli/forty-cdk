import { Directive, inject } from '@angular/core';

import { orphanContextError, registerA11yName } from 'forty-cdk/core';
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
    '[id]': 'id',
  },
})
export class ForComboboxGroupLabel {
  /** Stable host id used by the parent group's `aria-labelledby`. */
  readonly id: string;

  constructor() {
    const group = inject(ForComboboxGroup, { optional: true });
    if (!group) {
      throw orphanContextError({
        code: 'FORCDK-COMBOBOX-005',
        piece: 'ForComboboxGroupLabel',
        root: '[forComboboxGroup]',
        token: 'ForComboboxGroup',
      });
    }
    this.id = registerA11yName(group, 'for-combobox-group-label');
  }
}
