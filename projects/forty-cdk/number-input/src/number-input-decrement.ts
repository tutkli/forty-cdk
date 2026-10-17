import { computed, Directive, input } from '@angular/core';

import { hostButtonType, hostAriaLabel } from 'forty-cdk/core';
import { injectNumberInputGroup } from './number-input-context';

/**
 * Auxiliary "step down" button for a `[forNumberInput]`. Apply on a `<button>`
 * (the directive forces `type="button"` to prevent form submission). It stays
 * `tabindex="-1"` — focus belongs on the spinbutton input, which carries the
 * full keyboard map — and reflects `aria-disabled` + `data-disabled` when the
 * value is at `min` (or the control is disabled / read-only), never the native
 * `disabled` attribute, so a button that reaches the bound keeps focus.
 * Activation does nothing while disabled. A click also marks the spinbutton
 * touched, so a pointer-only user still engages touched-gated error display.
 *
 * Named by the uniform `ariaLabel` input or a static `aria-label` attribute,
 * which wins over the input (e.g. "Decrease quantity").
 *
 * @example
 * ```html
 * <button forNumberInputDecrement aria-label="Decrease">−</button>
 * <input forNumberInput [(value)]="qty" [min]="0" />
 * ```
 */
@Directive({
  selector: '[forNumberInputDecrement]',
  exportAs: 'forNumberInputDecrement',
  host: {
    '[attr.type]': 'buttonType()',
    tabindex: '-1',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(click)': 'step()',
  },
})
export class ForNumberInputDecrement {
  private readonly buttonType = hostButtonType();

  private readonly group = injectNumberInputGroup('ForNumberInputDecrement');

  /** Accessible name for the button. Emits `aria-label` only when truthy. */
  readonly ariaLabel = input<string | null>(null);

  private readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  private readonly isDisabled = computed(() => {
    const field = this.group.field();
    return !field || field.effectiveDisabled() || field.readonly() || field.atMin();
  });

  private step(): void {
    const field = this.group.field();
    if (!field || this.isDisabled()) {
      return;
    }
    field.decrement();
    field.markTouched();
  }
}
