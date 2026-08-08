import { Directive, inject } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';

import { FOR_CHECKBOX, type ForCheckbox } from './checkbox';

/**
 * Optional indicator slot inside a `ForCheckbox`. Apply on the element
 * the consumer wants to show only while the checkbox is `checked` or
 * `indeterminate` (typically a check icon, dash, or filled square). The
 * directive mirrors `data-state` from the parent so the consumer can
 * style transitions without per-state bindings; hide the unchecked state
 * via `[data-state="unchecked"] { display: none }` or `@if`.
 *
 * Purely a styling convenience — consumers happy with CSS `:has`
 * selectors or `[data-state]` checks on the parent can skip it entirely.
 */
@Directive({
  selector: '[forCheckboxIndicator]',
  exportAs: 'forCheckboxIndicator',
  host: {
    '[attr.data-state]': 'parent.dataState()',
  },
})
export class ForCheckboxIndicator {
  protected readonly parent: ForCheckbox;

  constructor() {
    const parent = inject(FOR_CHECKBOX, { optional: true });
    if (!parent) {
      throw orphanContextError({
        code: 'FORCDK-CHECKBOX-001',
        piece: 'ForCheckboxIndicator',
        root: '[forCheckbox]',
        token: 'FOR_CHECKBOX',
      });
    }
    this.parent = parent;
  }
}
