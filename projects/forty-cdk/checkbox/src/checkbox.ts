import { computed, Directive, InjectionToken, model } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

import {
  hostButtonType,
  FormUiControlBase,
  injectHiddenInput,
  injectSyntheticActivation,
} from 'forty-cdk/core';

/**
 * Injection key the `[forCheckboxIndicator]` uses to resolve its parent
 * checkbox, decoupled from the concrete `ForCheckbox` class. `ForCheckbox`
 * provides itself under this token, so a design system wrapping the checkbox
 * by subclassing re-points it at the subclass with a single provider
 * (`{ provide: FOR_CHECKBOX, useExisting: MtxCheckbox }`) and the indicator
 * keeps resolving — see `docs/wrapping-form-primitives.md`.
 */
export const FOR_CHECKBOX = new InjectionToken<ForCheckbox>('FOR_CHECKBOX');

/**
 * Headless checkbox implementing the
 * [WAI-ARIA Checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
 * with optional tri-state (`indeterminate`) support, plus Angular's
 * `FormCheckboxControl` from `@angular/forms/signals` for `[formField]`
 * auto-wiring.
 *
 * Works on a native `<button>` host and on any arbitrary host element (e.g.
 * `<div>`, `<span>`). On a `<button>` the directive forces `type="button"` to
 * avoid accidental form submission — through a host binding, so a consumer
 * `type="submit"` is overridden rather than honoured — and Enter / Space
 * activation comes from native button behavior (APG only mandates Space, and
 * Enter is harmless on a non-submit button). On a non-button host no `type`
 * attribute is emitted at all (`type` is not valid there), `tabindex="0"` is
 * applied and the same Enter / Space activation is synthesized, so the announced
 * `role="checkbox"` is never left keyboard-inoperable — including when the
 * host is composed through `hostDirectives`, which ignores a directive's
 * selector.
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
 * <!-- Non-button host — tabindex and keyboard handling added automatically -->
 * <div forCheckbox [(checked)]="agreed"></div>
 *
 * <!-- With Signal Forms: -->
 * <button forCheckbox [formField]="form.acceptTerms"></button>
 * ```
 */
@Directive({
  selector: '[forCheckbox]',
  exportAs: 'forCheckbox',
  providers: [{ provide: FOR_CHECKBOX, useExisting: ForCheckbox }],
  host: {
    role: 'checkbox',
    '[attr.type]': 'buttonType()',
    '[attr.tabindex]': 'tabindex()',
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
    '(keydown)': 'onKeydown($event)',
    '(keyup)': 'onKeyup($event)',
    '(blur)': 'onBlur()',
  },
})
export class ForCheckbox extends FormUiControlBase implements FormCheckboxControl {
  protected readonly buttonType = hostButtonType();

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

  readonly #activation = injectSyntheticActivation({ disabled: this.effectiveDisabled });

  protected readonly tabindex = this.#activation.tabindex;

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
