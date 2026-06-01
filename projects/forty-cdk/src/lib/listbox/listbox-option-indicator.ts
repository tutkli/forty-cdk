import { Directive, inject } from '@angular/core';

import { ForListboxOption } from './listbox-option';

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
    '[attr.data-state]': 'parent.selected() ? "checked" : "unchecked"',
    '[attr.hidden]': 'parent.selected() ? null : ""',
    '[style.display]': 'parent.selected() ? null : "none"',
  },
})
export class ForListboxOptionIndicator {
  protected readonly parent: ForListboxOption;

  constructor() {
    const parent = inject(ForListboxOption, { optional: true });
    if (!parent) {
      throw new Error(
        '[forty-cdk/listbox] ForListboxOptionIndicator must be used inside a [forListboxOption] element.',
      );
    }
    this.parent = parent;
  }
}
