import { Directive } from '@angular/core';

import { injectTreeItemContext } from './tree-context';

/**
 * Optional glyph slot inside a `[forTreeItemCheckbox]`. Shows only while the
 * node is checked; mirrors `data-state="checked" | "unchecked"` from the item.
 * Hidden state is enforced with an inline `display: none` (which beats any
 * author `display` rule applied via a class) in addition to the `hidden`
 * attribute that removes it from the a11y tree.
 */
@Directive({
  selector: '[forTreeItemCheckboxIndicator]',
  exportAs: 'forTreeItemCheckboxIndicator',
  host: {
    '[attr.data-state]': 'item.selected() ? "checked" : "unchecked"',
    '[attr.hidden]': 'item.selected() ? null : ""',
    '[style.display]': 'item.selected() ? null : "none"',
  },
})
export class ForTreeItemCheckboxIndicator {
  protected readonly item = injectTreeItemContext('ForTreeItemCheckboxIndicator');
}
