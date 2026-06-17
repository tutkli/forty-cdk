import { Directive } from '@angular/core';

import { injectTableContext } from './table-context';

/**
 * Marks a data row inside the table body (`role="row"`). Injecting the context
 * here enforces the orphan guard — using `[forTableRow]` outside a `[forTable]`
 * throws a prefixed error.
 */
@Directive({
  selector: '[forTableRow]',
  exportAs: 'forTableRow',
  host: {
    role: 'row',
  },
})
export class ForTableRow {
  protected readonly ctx = injectTableContext('ForTableRow');
}
