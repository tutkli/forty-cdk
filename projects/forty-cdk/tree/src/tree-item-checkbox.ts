import { computed, Directive } from '@angular/core';

import { fortyWarn, hostButtonType, preventPointerFocus } from 'forty-cdk/core';
import { injectTreeContext, injectTreeItemContext } from './tree-context';

/**
 * Visible checkbox surface inside a `ForTreeItem`, used in the tree's
 * `selectionMode="checkbox"` anatomy. Decorative for assistive tech — the
 * enclosing `treeitem` owns `aria-checked`, so this element is `aria-hidden`
 * and never takes focus, from Tab or from a mouse press; on a `<button>` host
 * it is `type="button"`, so a click never submits a form. Reflects
 * `data-state="checked" | "unchecked" | "indeterminate"` for styling, and
 * `data-disabled` while its node is disabled
 * by its own `[disabled]` or the root's. Clicking it activates the node — the
 * root's `(itemActivate)`, then the selection toggle unless that was vetoed —
 * and moves roving focus to the node; place a `[forTreeItemCheckboxIndicator]`
 * inside for the glyph.
 *
 * Belongs on a selectable node only: inside a `[selectable]="false"` node a
 * click selects nothing and warns in dev mode.
 */
@Directive({
  selector: '[forTreeItemCheckbox]',
  exportAs: 'forTreeItemCheckbox',
  host: {
    '[attr.type]': 'buttonType()',
    tabindex: '-1',
    'aria-hidden': 'true',
    '[attr.data-state]': 'dataState()',
    '[attr.data-disabled]': 'item.effectiveDisabled() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class ForTreeItemCheckbox {
  private readonly buttonType = hostButtonType();

  readonly #tree = injectTreeContext('ForTreeItemCheckbox');
  private readonly item = injectTreeItemContext('ForTreeItemCheckbox');

  constructor() {
    preventPointerFocus();
  }

  private readonly dataState = computed(() => {
    const state = this.item.checkState();
    return state === 'true' ? 'checked' : state === 'mixed' ? 'indeterminate' : 'unchecked';
  });

  private onClick(event: MouseEvent): void {
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
    this.#tree.activateItem(this.item, event);
    this.item.focusItem();
  }
}
