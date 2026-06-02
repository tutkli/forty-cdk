import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectTreeItemContext } from './tree-context';

/**
 * Pointer target for a `ForTreeItem` and the default typeahead text source.
 * Clicking it selects the node and moves roving focus to the `treeitem`
 * (focus stays on the item, never on the label). Place the
 * `[forTreeItemToggle]` and the node's visible text inside it.
 */
@Directive({
  selector: '[forTreeItemLabel]',
  exportAs: 'forTreeItemLabel',
  host: {
    '(click)': 'onClick()',
  },
})
export class ForTreeItemLabel {
  readonly #item = injectTreeItemContext('ForTreeItemLabel');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.#item.setLabel(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.#item.setLabel(null));
  }

  protected onClick(): void {
    this.#item.select();
    this.#item.focusItem();
  }
}
