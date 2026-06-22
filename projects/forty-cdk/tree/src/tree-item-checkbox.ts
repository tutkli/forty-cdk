import { computed, Directive } from '@angular/core';

import { injectTreeItemContext } from './tree-context';

/**
 * Visible checkbox surface inside a `ForTreeItem`, used in the tree's
 * `selectionMode="checkbox"` anatomy. Decorative for assistive tech — the
 * enclosing `treeitem` owns `aria-checked`, so this element is `aria-hidden`
 * and not separately focusable. Reflects `data-state="checked" | "unchecked" |
 * "indeterminate"` for styling. Clicking it toggles the node's selection and
 * moves roving focus to the node; place a `[forTreeItemCheckboxIndicator]`
 * inside for the glyph.
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
    this.item.select();
    this.item.focusItem();
  }
}
