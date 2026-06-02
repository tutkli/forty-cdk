import { computed, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { FOR_FIELD_CONTEXT } from './field-context';

/**
 * Accessible label for a form control. Inside a `[forField]` it auto-wires:
 * it adopts the field's `labelId`, registers itself so the control gains
 * `aria-labelledby`, and (on a non-`<label>` element, or for a non-native
 * control) focuses the control on click. On a native `<label>` it emits `for`
 * so the browser handles click-to-focus.
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
      this.ctx.focusControl();
    }
  }
}
