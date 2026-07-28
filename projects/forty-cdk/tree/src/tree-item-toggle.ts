import { DestroyRef, Directive, inject } from '@angular/core';

import { hostButtonType } from 'forty-cdk/core';
import { injectTreeItemContext } from './tree-context';

/**
 * Optional expand / collapse control inside a `ForTreeItem`. Its mere presence
 * marks the item as a parent (D4): a `treeitem` emits `aria-expanded` /
 * `data-state` only when a toggle is registered, so leaves (no toggle) emit
 * neither — matching the APG "end nodes lack `aria-expanded`" rule.
 *
 * Decorative: the enclosing `treeitem` owns `aria-expanded`, so the toggle is
 * `aria-hidden` and not separately focusable. Clicking it toggles expansion
 * without selecting the node.
 */
@Directive({
  selector: '[forTreeItemToggle]',
  exportAs: 'forTreeItemToggle',
  host: {
    '[attr.type]': 'buttonType()',
    tabindex: '-1',
    'aria-hidden': 'true',
    '[attr.data-state]': 'item.expanded() ? "open" : "closed"',
    '(click)': 'onClick($event)',
  },
})
export class ForTreeItemToggle {
  protected readonly buttonType = hostButtonType();

  protected readonly item = injectTreeItemContext('ForTreeItemToggle');

  constructor() {
    const unregister = this.item.registerToggle();
    inject(DestroyRef).onDestroy(unregister);
  }

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.item.toggle();
  }
}
