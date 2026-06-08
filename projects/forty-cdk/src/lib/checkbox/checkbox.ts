import { computed, Directive, model } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';

/**
 * Headless checkbox implementing the
 * [WAI-ARIA Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
 * with optional tri-state (`indeterminate`) support, plus Angular's
 * `FormCheckboxControl` from `@angular/forms/signals` for `[formField]`
 * auto-wiring.
 *
 * Apply on a `<button type="button">`. The directive forces `type="button"`
 * to avoid accidental form submission; Enter and Space activation come from
 * native button behavior (APG only mandates Space, and Enter is harmless on
 * a non-submit button).
 *
 * Tri-state: when `indeterminate` is `true`, `aria-checked="mixed"` is
 * announced regardless of `checked`. Activating an indeterminate checkbox
 * clears `indeterminate` and toggles `checked` from its current value
 * (matches native `<input type="checkbox">` behavior).
 *
 * The accessible name is the consumer's responsibility — wrap the button in a
 * `<label>` or use `aria-labelledby` / `aria-label`.
 *
 * @example
 * ```html
 * <button forCheckbox [(checked)]="agreed">
 *   <span class="indicator"></span>
 * </button>
 * I agree to the terms.
 *
 * <!-- With Signal Forms: -->
 * <button forCheckbox [formField]="form.acceptTerms"></button>
 * ```
 */
@Directive({
  selector: '[forCheckbox]',
  exportAs: 'forCheckbox',
  host: {
    role: 'checkbox',
    type: 'button',
    '[attr.aria-checked]': 'ariaChecked()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.name]': 'name() || null',
    '[attr.data-state]': 'dataState()',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '(click)': 'onClick()',
    '(blur)': 'touched.set(true)',
  },
})
export class ForCheckbox extends FormUiControlBase implements FormCheckboxControl {
  /** Two-way bindable on/off state. Required by `FormCheckboxControl`. */
  readonly checked = model<boolean>(false);

  /**
   * Two-way bindable indeterminate state. When true, `aria-checked="mixed"`
   * is announced regardless of `checked`. Activation clears it.
   *
   * Not part of `FormCheckboxControl` — the field's value stays binary.
   * Indeterminate is a UI-only concern (e.g. a parent "select all" reflecting
   * children with mixed selection).
   */
  readonly indeterminate = model<boolean>(false);

  protected readonly ariaChecked = computed<'true' | 'false' | 'mixed'>(() => {
    if (this.indeterminate()) return 'mixed';
    return this.checked() ? 'true' : 'false';
  });

  /**
   * Logical state reflected on `data-state`: `'checked'`, `'unchecked'`, or
   * `'indeterminate'`. Exposed so `ForCheckboxIndicator` can mirror it without
   * re-deriving the same mapping.
   */
  readonly dataState = computed<'checked' | 'unchecked' | 'indeterminate'>(() => {
    if (this.indeterminate()) return 'indeterminate';
    return this.checked() ? 'checked' : 'unchecked';
  });

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      // Matches native `<input type="checkbox">`: only `checked` contributes
      // to form submission; `indeterminate` is purely a presentational flag.
      values: computed(() => (this.checked() ? ['on'] : [])),
      disabled: this.effectiveDisabled,
    });
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    if (this.indeterminate()) {
      this.indeterminate.set(false);
    }
    this.checked.update((v) => !v);
  }
}
