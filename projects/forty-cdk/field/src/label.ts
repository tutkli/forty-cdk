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
 * label activates the control either way, not just focuses it. A native
 * `<label>` whose `for` resolves to a non-labelable element gets the same
 * treatment, since the browser forwards nothing there: that is the composite
 * case, where the control is named on a `role="group"` a `<label for>` cannot
 * reach (`[forDateField]`, `[forTimeField]`, their range siblings). A click
 * that originated on the control (when the control is nested inside the label
 * host) is not re-forwarded, so a label-wrapping layout toggles once, matching
 * native `<label>` semantics.
 *
 * Usable standalone outside a field — there it is an inert
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
    '(click)': 'onClick($event)',
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

  protected onClick(event: MouseEvent): void {
    if (!this.ctx || this.#browserForwards()) {
      return;
    }
    // When the control is nested inside the label host (label wraps control),
    // a click on the control already activates it natively; forwarding again
    // would double-toggle. Mirror native `<label>` semantics and bail when the
    // click originated from the control (or anything inside it).
    const control = this.ctx.control();
    const controlEl = control?.labelledElement?.() ?? control?.host ?? null;
    const target = event.target as Node | null;
    if (controlEl && target && controlEl.contains(target)) {
      return;
    }
    this.ctx.clickControl();
  }

  /**
   * Whether the browser itself forwards this click, in which case the
   * directive must not forward it too. True only on a native `<label>` that
   * resolved a labeled control — `for` pointing at a non-labelable element
   * (a composite's `role="group"`) leaves `control` null and the browser
   * forwards nothing, so the directive owns the activation there.
   */
  #browserForwards(): boolean {
    const host = this.#host.nativeElement;
    return host.tagName === 'LABEL' && (host as HTMLLabelElement).control !== null;
  }
}
