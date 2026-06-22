import { DestroyRef, Directive, inject } from '@angular/core';

import { injectFieldContext } from './field-context';

/**
 * Supplementary description / hint for a form control. Adopts the field's
 * `descriptionId` and registers itself so the control gains
 * `aria-describedby`. Apply on a `<p>` / `<span>` inside a `[forField]`.
 */
@Directive({
  selector: '[forFieldDescription]',
  exportAs: 'forFieldDescription',
  host: {
    '[attr.id]': 'ctx.descriptionId()',
  },
})
export class ForFieldDescription {
  protected readonly ctx = injectFieldContext('ForFieldDescription');

  constructor() {
    const unregister = this.ctx.registerDescription();
    inject(DestroyRef).onDestroy(unregister);
  }
}
