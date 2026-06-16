import { computed, Directive } from '@angular/core';

import { injectTreeItemContext } from './tree-context';

/**
 * Optional glyph slot inside a `[forTreeItemCheckbox]`. Shows while the node
 * is checked or indeterminate (`data-state="checked"` or `"indeterminate"`);
 * self-hides only when fully unchecked. Hidden state is enforced with an inline
 * `display: none` (which beats any author `display` rule applied via a class)
 * in addition to the `hidden` attribute that removes it from the a11y tree.
 * Mirrors `data-state="checked" | "unchecked" | "indeterminate"` from the item.
 */
@Directive({
  selector: '[forTreeItemCheckboxIndicator]',
  exportAs: 'forTreeItemCheckboxIndicator',
  host: {
    '[attr.data-state]': 'dataState()',
    '[attr.hidden]': 'shown() ? null : ""',
    '[style.display]': 'shown() ? null : "none"',
  },
})
export class ForTreeItemCheckboxIndicator {
  protected readonly item = injectTreeItemContext('ForTreeItemCheckboxIndicator');

  protected readonly shown = computed(() => this.item.checkState() !== 'false');
  protected readonly dataState = computed(() => {
    const state = this.item.checkState();
    return state === 'true' ? 'checked' : state === 'mixed' ? 'indeterminate' : 'unchecked';
  });
}
