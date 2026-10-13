import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectFieldContext } from './field-context';

/**
 * Supplementary description / hint for a form control. Adopts the field's
 * `descriptionId` and registers itself so the control gains
 * `aria-describedby`. Apply on a `<p>` / `<span>` inside a `[forField]`. A
 * consumer-set static `id` is kept and becomes the field's `descriptionId`.
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
    const unregister = this.ctx.registerDescription(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
    );
    inject(DestroyRef).onDestroy(unregister);
  }
}
