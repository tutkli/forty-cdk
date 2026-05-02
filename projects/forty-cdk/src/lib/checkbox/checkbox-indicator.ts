import { computed, Directive, inject } from '@angular/core';

import { ForCheckbox } from './checkbox';

/**
 * Optional indicator slot inside a `ForCheckbox`. Apply on the element
 * the consumer wants to show only while the checkbox is `checked` or
 * `indeterminate` (typically a check icon, dash, or filled square). The
 * directive flips `[hidden]` and mirrors `data-state` from the parent so
 * the consumer can style transitions without per-state bindings.
 *
 * Purely a styling convenience — consumers happy with CSS `:has`
 * selectors or `[data-state]` checks on the parent can skip it entirely.
 */
@Directive({
  selector: '[forCheckboxIndicator]',
  exportAs: 'forCheckboxIndicator',
  host: {
    '[attr.data-state]': 'state()',
    '[attr.hidden]': 'visible() ? null : ""',
  },
})
export class ForCheckboxIndicator {
  readonly #parent: ForCheckbox;

  constructor() {
    const parent = inject(ForCheckbox, { optional: true });
    if (!parent) {
      throw new Error(
        '[forty-cdk/checkbox] ForCheckboxIndicator must be used inside a [forCheckbox] element.',
      );
    }
    this.#parent = parent;
  }

  protected readonly state = computed<'checked' | 'unchecked' | 'indeterminate'>(() => {
    if (this.#parent.indeterminate()) return 'indeterminate';
    return this.#parent.checked() ? 'checked' : 'unchecked';
  });

  protected readonly visible = computed<boolean>(
    () => this.#parent.checked() || this.#parent.indeterminate(),
  );
}
