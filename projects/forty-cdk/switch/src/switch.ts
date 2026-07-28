import { computed, Directive, model } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

import { FormUiControlBase, injectHiddenInput, injectSyntheticActivation } from 'forty-cdk/core';

/**
 * Headless on/off switch implementing the
 * [WAI-ARIA Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
 * and Angular's `FormCheckboxControl` from `@angular/forms/signals` so it
 * auto-wires with `[formField]`.
 *
 * Works on a native `<button>` host and on any arbitrary host element (e.g.
 * `<div>`, `<span>`). On a `<button>` Enter / Space activation comes from native
 * button behavior and the directive forces `type="button"` to prevent
 * accidental form submission when nested inside a `<form>`. On a non-button
 * host `tabindex="0"` is applied and the same Enter / Space activation is
 * synthesized, so the announced `role="switch"` is never left
 * keyboard-inoperable — including when the host is composed through
 * `hostDirectives`, which ignores a directive's selector.
 *
 * @example
 * ```html
 * <button forSwitch [(checked)]="enabled">
 *   <span class="thumb"></span>
 * </button>
 *
 * <!-- Non-button host — tabindex and keyboard handling added automatically -->
 * <div forSwitch [(checked)]="enabled"></div>
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
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.name]': 'name() || null',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
    '(keyup)': 'onKeyup($event)',
    '(blur)': 'onBlur()',
  },
})
export class ForSwitch extends FormUiControlBase implements FormCheckboxControl {
  /** Two-way bindable on/off state. Required by `FormCheckboxControl`. */
  readonly checked = model<boolean>(false);

  readonly #activation = injectSyntheticActivation({ disabled: this.effectiveDisabled });

  protected readonly tabindex = this.#activation.tabindex;

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => (this.checked() ? ['on'] : [])),
      disabled: this.effectiveDisabled,
    });
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.checked.update((v) => !v);
  }

  protected onKeydown(event: KeyboardEvent): void {
    this.#activation.keydown(event);
  }

  protected onKeyup(event: KeyboardEvent): void {
    this.#activation.keyup(event);
  }

  protected onBlur(): void {
    this.#activation.reset();
    this.markTouched();
  }
}
