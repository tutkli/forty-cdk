import { Directive, inject } from '@angular/core';

import { orphanContextError, registerA11yName } from 'forty-cdk/core';
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
    '[id]': 'id',
  },
})
export class ForSelectGroupLabel {
  /** Stable host id used by the parent group's `aria-labelledby`. */
  readonly id: string;

  constructor() {
    const group = inject(ForSelectGroup, { optional: true });
    if (!group) {
      throw orphanContextError({
        code: 'FORCDK-SELECT-003',
        piece: 'ForSelectGroupLabel',
        root: '[forSelectGroup]',
        token: 'ForSelectGroup',
      });
    }
    this.id = registerA11yName(group, 'for-select-group-label');
  }
}
