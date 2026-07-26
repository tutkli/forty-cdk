import { computed, Directive, input } from '@angular/core';

import { reflectDisabled, hostAriaLabel } from 'forty-cdk/core';
import { injectNumberInputGroup } from './number-input-context';

/**
 * Auxiliary "step up" button for a `[forNumberInput]`. Apply on a `<button>`
 * (the directive forces `type="button"` to prevent form submission). It stays
 * `tabindex="-1"` — focus belongs on the spinbutton input, which carries the
 * full keyboard map — and reflects `[disabled]` + `data-disabled` when the
 * value is at `max` (or the control is disabled / read-only). A click also marks
 * the spinbutton touched, so a pointer-only user still engages touched-gated
 * error display.
 *
 * Takes the uniform `ariaLabel` input so consumers can name it (e.g.
 * "Increase quantity").
 *
 * @example
 * ```html
 * <input forNumberInput [(value)]="qty" [max]="10" />
 * <button forNumberInputIncrement aria-label="Increase">+</button>
 * ```
 */
@Directive({
  selector: '[forNumberInputIncrement]',
  exportAs: 'forNumberInputIncrement',
  host: {
    type: 'button',
    tabindex: '-1',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(click)': 'step()',
  },
})
export class ForNumberInputIncrement {
  protected readonly group = injectNumberInputGroup('ForNumberInputIncrement');

  /** Accessible name for the button. Emits `aria-label` only when truthy. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  protected readonly isDisabled = computed(() => {
    const field = this.group.field();
    return !field || field.effectiveDisabled() || field.readonly() || field.atMax();
  });

  constructor() {
    reflectDisabled(this.isDisabled);
  }

  protected step(): void {
    const field = this.group.field();
    if (!field) {
      return;
    }
    field.increment();
    field.markTouched();
  }
}
