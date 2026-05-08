import { computed, Directive, model } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

import { injectFormControlReflection } from '../_internal/form-control-reflection/form-control-reflection';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';

/**
 * Headless on/off switch implementing the
 * [WAI-ARIA Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
 * and Angular's `FormCheckboxControl` from `@angular/forms/signals` so it
 * auto-wires with `[formField]`.
 *
 * Apply on a `<button type="button">` so Enter / Space activation come from
 * native button behavior. The directive forces `type="button"` to prevent
 * accidental form submission when nested inside a `<form>`.
 *
 * @example
 * ```html
 * <button forSwitch [(checked)]="enabled">
 *   <span class="thumb"></span>
 * </button>
 *
 * <!-- With Signal Forms: -->
 * <button forSwitch [formField]="settings.notifications"></button>
 * ```
 */
@Directive({
  selector: '[forSwitch]',
  exportAs: 'forSwitch',
  host: {
    role: 'switch',
    type: 'button',
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.name]': 'name() || null',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '(click)': 'onClick()',
    '(blur)': 'touched.set(true)',
  },
})
export class ForSwitch extends FormUiControlBase implements FormCheckboxControl {
  /** Two-way bindable on/off state. Required by `FormCheckboxControl`. */
  readonly checked = model<boolean>(false);

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => (this.checked() ? ['on'] : [])),
      disabled: this.disabled,
    });
    injectFormControlReflection({
      touched: this.touched,
      dirty: this.dirty,
      pending: this.pending,
      invalid: this.invalid,
    });
  }

  protected onClick(): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.checked.update((v) => !v);
  }
}
