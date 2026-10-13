import { booleanAttribute, computed, Directive, inject, input } from '@angular/core';

import { FOR_FIELDSET_CONTEXT, reflectDisabled } from 'forty-cdk/core';
import { injectFieldWiring } from './field-context';

/**
 * Opt-in marker that wires a non-forty-cdk control — a native `<input>`,
 * `<textarea>`, `<select>`, or any custom element — into its surrounding
 * `[forField]`. forty-cdk form primitives (which extend the shared form base)
 * auto-wire and do **not** need this; it exists for plain native controls that
 * have no primitive of their own.
 *
 * Validation state is consumer-driven via the `invalid` / `required` /
 * `disabled` / `touched` inputs (native controls have no Signal Forms errors
 * to surface). Reflects `aria-invalid` on the host, and the native `disabled`
 * attribute while its own `disabled` input or a surrounding `[forFieldset]`'s
 * `disabled` is set.
 *
 * @example
 * ```html
 * <div forField>
 *   <label forLabel>Email</label>
 *   <input forFieldControl type="email" [invalid]="emailInvalid()" />
 * </div>
 * ```
 */
@Directive({
  selector: '[forFieldControl]',
  exportAs: 'forFieldControl',
  host: {
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
  },
})
export class ForFieldControl {
  /** Marks the control invalid — drives the field's error region and `aria-invalid`. */
  readonly invalid = input(false, { transform: booleanAttribute });
  /** Marks the control required — reflected by the field as `data-required`. */
  readonly required = input(false, { transform: booleanAttribute });
  /**
   * Marks the control disabled — reflected on the host as the native `disabled`
   * attribute and by the field as `data-disabled`.
   */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Marks the control touched — reflected by the field as `data-touched`. */
  readonly touched = input(false, { transform: booleanAttribute });

  readonly #fieldset = inject(FOR_FIELDSET_CONTEXT, { optional: true });

  constructor() {
    injectFieldWiring({
      invalid: this.invalid,
      required: this.required,
      disabled: this.disabled,
      touched: this.touched,
    });
    reflectDisabled(computed(() => this.disabled() || (this.#fieldset?.disabled() ?? false)));
  }
}
