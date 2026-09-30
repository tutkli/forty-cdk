import { computed, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { crossesInteractiveContent, resolveEventTarget } from 'forty-cdk/core';
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
 * A press on other interactive content inside the label host (a `<button>`, an
 * `<a href>`, a form element, a `<summary>` or any element with a `tabindex`)
 * belongs to that element, as it does inside a native `<label>`: the control
 * is neither clicked nor focused, the element takes focus as usual, and an open
 * panel treats the press as an outside press.
 *
 * Pressing the label is pressing the control's trigger: on an overlay control
 * (`[forSelect]`, a picker-anatomy `[forCombobox]`, `[forDatePicker]`,
 * `[forTimePicker]`) it toggles the panel exactly once whether the panel is
 * open or closed. A press on the label never moves focus anywhere but the
 * control and does not start a text selection.
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
    '(mousedown)': 'onMouseDown($event)',
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
      const unregister = ctx.registerLabel(this.#host.nativeElement);
      inject(DestroyRef).onDestroy(unregister);
    }
  }

  protected onMouseDown(event: MouseEvent): void {
    if (event.button === 0 && this.#pressedTarget(event)) {
      event.preventDefault();
    }
  }

  protected onClick(event: MouseEvent): void {
    const target = this.#pressedTarget(event);
    if (!target || !this.ctx) {
      return;
    }
    const nativeControl = this.#nativeControl();
    if (nativeControl === target) {
      return;
    }
    if (nativeControl) {
      event.preventDefault();
    }
    this.ctx.clickControl();
  }

  #pressedTarget(event: Event): HTMLElement | null {
    const target = this.ctx?.activationTarget() ?? null;
    const origin = event.target as Node | null;
    if (!target || (origin && target.contains(origin))) {
      return null;
    }
    if (crossesInteractiveContent(resolveEventTarget(event), this.#host.nativeElement)) {
      return null;
    }
    return target;
  }

  #nativeControl(): HTMLElement | null {
    const host = this.#host.nativeElement;
    return host.tagName === 'LABEL' ? (host as HTMLLabelElement).control : null;
  }
}
