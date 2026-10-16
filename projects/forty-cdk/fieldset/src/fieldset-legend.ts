import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { FOR_FIELDSET_CONTEXT, hostStaticAttribute } from 'forty-cdk/core';

/**
 * Accessible group label for a `[forFieldset]`. Inside a fieldset it emits the
 * fieldset's `legendId` and registers itself so the group's `aria-labelledby`
 * resolves; on a native `<fieldset>`/`<legend>` the id is harmless extra wiring
 * (the browser groups implicitly).
 *
 * A consumer-set **static** `id` on the host wins: it is adopted into the
 * fieldset's `legendId` at construction, so external references to it keep
 * resolving and the group's `aria-labelledby` follows it. A `[id]="expr"`
 * property binding is not adopted.
 *
 * Usable standalone outside a fieldset — there it is an inert marker that keeps
 * the consumer's own static `id`.
 *
 * @example
 * ```html
 * <div forFieldset>
 *   <span forFieldsetLegend>Notification preferences</span>
 *   <!-- … fields … -->
 * </div>
 * ```
 */
@Directive({
  selector: '[forFieldsetLegend]',
  exportAs: 'forFieldsetLegend',
  host: {
    '[attr.id]': 'legendId()',
  },
})
export class ForFieldsetLegend {
  private readonly ctx = inject(FOR_FIELDSET_CONTEXT, { optional: true });

  private readonly legendId = hostStaticAttribute('id', () => this.ctx?.legendId() ?? null);

  constructor() {
    const ctx = this.ctx;
    if (ctx) {
      ctx.adoptLegendId(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
      const unregister = ctx.registerLegend();
      inject(DestroyRef).onDestroy(unregister);
    }
  }
}
