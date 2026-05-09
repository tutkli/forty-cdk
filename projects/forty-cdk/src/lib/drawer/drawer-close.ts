import { Directive, input } from '@angular/core';

import { injectDrawerContext } from './drawer-context';

/**
 * Button that closes the surrounding drawer when clicked. Apply on a
 * `<button>` inside `[forDrawer]`. Pass `[closeWith]` to propagate a return
 * value to `ForDrawerRef.close()` in programmatic usage; ignored in
 * declarative usage.
 */
@Directive({
  selector: '[forDrawerClose]',
  exportAs: 'forDrawerClose',
  host: {
    type: 'button',
    'data-state': 'open',
    '(click)': 'onClick()',
  },
})
export class ForDrawerClose {
  readonly #ctx = injectDrawerContext('ForDrawerClose');

  /** Optional value passed to `ForDrawerRef.close()` (programmatic mode). */
  readonly closeWith = input<unknown>(undefined);

  protected onClick(): void {
    this.#ctx.requestClose('closeButton', this.closeWith());
  }
}
