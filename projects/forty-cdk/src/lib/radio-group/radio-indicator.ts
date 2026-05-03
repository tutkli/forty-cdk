import { Directive, inject } from '@angular/core';

import { ForRadio } from './radio';

/**
 * Optional indicator slot inside a `ForRadio`. Apply on the element the
 * consumer wants to show only while this radio is selected (typically a
 * filled dot inside the radio circle). The directive flips `[hidden]`
 * and mirrors `data-state` from the parent radio.
 *
 * Purely a styling convenience.
 */
@Directive({
  selector: '[forRadioIndicator]',
  exportAs: 'forRadioIndicator',
  host: {
    '[attr.data-state]': 'parent.checked() ? "checked" : "unchecked"',
    '[attr.data-orientation]': 'parent.group.orientation()',
    '[attr.hidden]': 'parent.checked() ? null : ""',
  },
})
export class ForRadioIndicator {
  protected readonly parent: ForRadio;

  constructor() {
    const parent = inject(ForRadio, { optional: true });
    if (!parent) {
      throw new Error(
        '[forty-cdk/radio-group] ForRadioIndicator must be used inside a [forRadio] element.',
      );
    }
    this.parent = parent;
  }
}
