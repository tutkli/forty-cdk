import { computed, Directive } from '@angular/core';

import { fortyWarn } from 'forty-cdk/core';
import { injectTreeItemContext } from './tree-context';

/**
 * Visible checkbox surface inside a `ForTreeItem`, used in the tree's
 * `selectionMode="checkbox"` anatomy. Decorative for assistive tech — the
 * enclosing `treeitem` owns `aria-checked`, so this element is `aria-hidden`
 * and not separately focusable. Reflects `data-state="checked" | "unchecked" |
 * "indeterminate"` for styling. Clicking it toggles the node's selection and
 * moves roving focus to the node; place a `[forTreeItemCheckboxIndicator]`
 * inside for the glyph.
 *
 * Belongs on a selectable node only: inside a `[selectable]="false"` node a
 * click selects nothing and warns in dev mode.
 */
@Directive({
  selector: '[forTreeItemCheckbox]',
  exportAs: 'forTreeItemCheckbox',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'dataState()',
    '(click)': 'onClick($event)',
  },
})
export class ForTreeItemCheckbox {
  protected readonly item = injectTreeItemContext('ForTreeItemCheckbox');

  protected readonly dataState = computed(() => {
    const state = this.item.checkState();
    return state === 'true' ? 'checked' : state === 'mixed' ? 'indeterminate' : 'unchecked';
  });

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.item.selectable()) {
      fortyWarn({
        code: 'FORCDK-TREE-006',
        message: `[forTreeItemCheckbox] was clicked inside the [selectable]="false" node "${String(this.item.value())}", so the click selects nothing.`,
        cause:
          'A structural node takes no part in selection and its treeitem emits no aria-checked, ' +
          "but the checkbox still paints the node's check state as a control.",
        fix:
          'Remove [forTreeItemCheckbox] from the structural node. To show its roll-up, read ' +
          'checkState() off the node instead (#item="forTreeItem").',
      });
    }
    this.item.select();
    this.item.focusItem();
  }
}
