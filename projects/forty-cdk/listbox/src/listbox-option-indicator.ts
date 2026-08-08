import { Directive, inject } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';

import { FOR_LISTBOX_OPTION, type ForListboxOption } from './listbox-option';

/**
 * Optional indicator slot inside a `ForListboxOption`. Apply on the
 * element the consumer wants to show only while this option is selected
 * (typically a check icon to the left of the label). Mirrors `data-state`
 * and hides itself while unselected. Visibility is enforced with an inline
 * `display: none` (which beats any author `display` rule a consumer applies
 * via a class) in addition to the `hidden` attribute that removes it from
 * the a11y tree.
 */
@Directive({
  selector: '[forListboxOptionIndicator]',
  exportAs: 'forListboxOptionIndicator',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'parent.selected() ? "checked" : "unchecked"',
    '[attr.hidden]': 'parent.selected() ? null : ""',
    '[style.display]': 'parent.selected() ? null : "none"',
  },
})
export class ForListboxOptionIndicator {
  protected readonly parent: ForListboxOption;

  constructor() {
    const parent = inject(FOR_LISTBOX_OPTION, { optional: true });
    if (!parent) {
      throw orphanContextError({
        code: 'FORCDK-LISTBOX-003',
        piece: 'ForListboxOptionIndicator',
        root: '[forListboxOption]',
        token: 'FOR_LISTBOX_OPTION',
      });
    }
    this.parent = parent;
  }
}
