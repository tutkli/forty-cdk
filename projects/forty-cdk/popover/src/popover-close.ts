import { Directive } from '@angular/core';

import { hostButtonType } from 'forty-cdk/core';
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
    '[attr.type]': 'buttonType()',
    '(click)': 'onClick()',
  },
})
export class ForPopoverClose {
  protected readonly buttonType = hostButtonType();

  readonly #ctx = injectPopoverContext('ForPopoverClose');

  protected onClick(): void {
    this.#ctx.close();
  }
}
