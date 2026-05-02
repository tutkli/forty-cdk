import { Directive, inject } from '@angular/core';

import { ForListboxOption } from './listbox-option';

/**
 * Optional indicator slot inside a `ForListboxOption`. Apply on the
 * element the consumer wants to show only while this option is selected
 * (typically a check icon to the left of the label). Flips `[hidden]`
 * and mirrors `data-state`.
 */
@Directive({
  selector: '[forListboxOptionIndicator]',
  exportAs: 'forListboxOptionIndicator',
  host: {
    '[attr.data-state]': 'parent.selected() ? "checked" : "unchecked"',
    '[attr.hidden]': 'parent.selected() ? null : ""',
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
