import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectTreeContext, injectTreeItemContext } from './tree-context';

/**
 * Pointer target for a `ForTreeItem` and the default typeahead text source.
 * Clicking it activates the node — the root's `(itemActivate)`, then the
 * selection unless that was vetoed — and moves roving focus to the `treeitem`
 * (focus stays on the item, never on the label). Place the
 * `[forTreeItemToggle]` and the node's visible text inside it.
 */
@Directive({
  selector: '[forTreeItemLabel]',
  exportAs: 'forTreeItemLabel',
  host: {
    '(click)': 'onClick($event)',
  },
})
export class ForTreeItemLabel {
  readonly #tree = injectTreeContext('ForTreeItemLabel');
  readonly #item = injectTreeItemContext('ForTreeItemLabel');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.#item.setLabel(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.#item.setLabel(null));
  }

  protected onClick(event: MouseEvent): void {
    this.#tree.activateItem(this.#item, event);
    this.#item.focusItem();
  }
}
