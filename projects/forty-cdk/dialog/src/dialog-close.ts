import { Directive, input } from '@angular/core';

import { hostButtonType } from 'forty-cdk/core';
import { injectDialogContext } from './dialog-context';

/**
 * Button that closes the surrounding dialog when clicked. Apply on a
 * `<button>` inside `[forDialog]`. Pass `[closeWith]` to propagate a return
 * value to `ForDialogRef.close()` in programmatic usage; ignored in
 * declarative usage.
 */
@Directive({
  selector: '[forDialogClose]',
  exportAs: 'forDialogClose',
  host: {
    '[attr.type]': 'buttonType()',
    'data-state': 'open',
    '(click)': 'onClick()',
  },
})
export class ForDialogClose {
  protected readonly buttonType = hostButtonType();

  readonly #ctx = injectDialogContext('ForDialogClose');

  /** Optional value passed to `ForDialogRef.close()` (programmatic mode). */
  readonly closeWith = input<unknown>(undefined);

  protected onClick(): void {
    this.#ctx.requestClose('closeButton', this.closeWith());
  }
}
