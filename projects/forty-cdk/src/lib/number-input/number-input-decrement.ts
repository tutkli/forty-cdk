import { computed, Directive, input } from '@angular/core';

import { injectNumberInputGroup } from './number-input-context';

/**
 * Auxiliary "step down" button for a `[forNumberInput]`. Apply on a `<button>`
 * (the directive forces `type="button"` to prevent form submission). It stays
 * `tabindex="-1"` — focus belongs on the spinbutton input, which carries the
 * full keyboard map — and reflects `[disabled]` + `data-disabled` when the
 * value is at `min` (or the control is disabled / read-only).
 *
 * Takes the uniform `ariaLabel` input so consumers can name it (e.g.
 * "Decrease quantity").
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
    type: 'button',
    tabindex: '-1',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.disabled]': 'isDisabled() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(click)': 'step()',
  },
})
export class ForNumberInputDecrement {
  protected readonly group = injectNumberInputGroup('ForNumberInputDecrement');

  /** Accessible name for the button. Emits `aria-label` only when truthy. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly isDisabled = computed(() => {
    const field = this.group.field();
    return !field || field.effectiveDisabled() || field.readonly() || field.atMin();
  });

  protected step(): void {
    this.group.field()?.decrement();
  }
}
