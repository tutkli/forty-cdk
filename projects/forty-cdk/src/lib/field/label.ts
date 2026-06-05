import { computed, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { FOR_FIELD_CONTEXT } from './field-context';

/**
 * Accessible label for a form control. Inside a `[forField]` it auto-wires:
 * it adopts the field's `labelId` and registers itself so the control gains
 * `aria-labelledby`.
 *
 * Click-to-activate is consistent across both host shapes: a native `<label>`
 * emits `for` and the browser forwards the click to the control (toggling a
 * checkbox / switch, activating a button); a non-`<label>` host has no native
 * `for` forwarding, so the directive forwards the click itself — clicking the
 * label activates the control either way, not just focuses it.
 *
 * Usable standalone (Radix-style) outside a field — there it is an inert
 * marker and the consumer wires native `for` themselves.
 *
 * @example
 * ```html
 * <div forField>
 *   <label forLabel>Email</label>
 *   <input forFieldControl type="email" />
 * </div>
 * ```
 */
@Directive({
  selector: '[forLabel]',
  exportAs: 'forLabel',
  host: {
    '[attr.id]': 'labelId()',
    '[attr.for]': 'forAttr()',
    '(click)': 'onClick()',
  },
})
export class ForLabel {
  protected readonly ctx = inject(FOR_FIELD_CONTEXT, { optional: true });
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The label's id when inside a field, else null. */
  protected readonly labelId = computed(() => this.ctx?.labelId() ?? null);

  /** `for` is only meaningful on a native `<label>`; null otherwise. */
  protected readonly forAttr = computed(() => {
    if (!this.ctx || this.#host.nativeElement.tagName !== 'LABEL') {
      return null;
    }
    return this.ctx.controlId();
  });

  constructor() {
    const ctx = this.ctx;
    if (ctx) {
      const unregister = ctx.registerLabel();
      inject(DestroyRef).onDestroy(unregister);
    }
  }

  protected onClick(): void {
    if (this.ctx && this.#host.nativeElement.tagName !== 'LABEL') {
      this.ctx.clickControl();
    }
  }
}
