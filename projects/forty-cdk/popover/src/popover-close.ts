import { Directive } from '@angular/core';

import { injectPopoverContext } from './popover-context';

/**
 * Button that closes the surrounding popover when clicked. Apply on a
 * `<button>` inside `[forPopoverContent]`. Bypasses `dismissible` — an
 * explicit close button is always honored.
 */
@Directive({
  selector: '[forPopoverClose]',
  exportAs: 'forPopoverClose',
  host: {
    type: 'button',
    '(click)': 'onClick()',
  },
})
export class ForPopoverClose {
  readonly #ctx = injectPopoverContext('ForPopoverClose');

  protected onClick(): void {
    this.#ctx.close();
  }
}
