import { computed, DestroyRef, Directive, inject } from '@angular/core';

import { FOR_FIELDSET_CONTEXT } from './fieldset-context';

/**
 * Accessible group label for a `[forFieldset]`. Inside a fieldset it adopts the
 * fieldset's `legendId` and registers itself so the group's `aria-labelledby`
 * resolves; on a native `<fieldset>`/`<legend>` the id is harmless extra wiring
 * (the browser groups implicitly).
 *
 * Usable standalone outside a fieldset — there it is an inert marker.
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
  protected readonly ctx = inject(FOR_FIELDSET_CONTEXT, { optional: true });

  /** The legend's id when inside a fieldset, else null. */
  protected readonly legendId = computed(() => this.ctx?.legendId() ?? null);

  constructor() {
    const ctx = this.ctx;
    if (ctx) {
      const unregister = ctx.registerLegend();
      inject(DestroyRef).onDestroy(unregister);
    }
  }
}
