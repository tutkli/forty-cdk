import { computed, Directive } from '@angular/core';

import { injectTableRowContext } from './table-context';

/**
 * Decorative per-row selection affordance inside a `[forTableRow]`. Clicking it
 * toggles the row's selection; the enclosing row owns the announced
 * `aria-selected`, so this element is `aria-hidden` and reflects
 * `data-state="checked" | "unchecked"` for styling only. Place a glyph inside.
 */
@Directive({
  selector: '[forTableRowSelector]',
  exportAs: 'forTableRowSelector',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'dataState()',
    '(click)': 'onClick($event)',
  },
})
export class ForTableRowSelector {
  protected readonly row = injectTableRowContext('ForTableRowSelector');

  protected readonly dataState = computed(() => (this.row.selected() ? 'checked' : 'unchecked'));

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.row.toggleSelected();
  }
}
