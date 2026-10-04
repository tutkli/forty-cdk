import { Directive, ElementRef, inject, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { reflectDisabled } from '../host-attributes/disabled-reflection';
import { FormUiControlBase } from './form-ui-control-base';
import { mirrorValue } from './value-mirror';

/**
 * Shared base for the text-valued form controls `ForInput` and `ForTextarea`.
 * Owns the `value` model and the bridge between the native element's editing
 * (the `input` event) and that signal, layered on the universal form-control
 * inputs inherited from `FormUiControlBase`.
 *
 * The native `<input>` / `<textarea>` is itself the submittable element: each
 * concrete directive reflects `[attr.name]` on its host, so the browser
 * serializes the field natively. No hidden input is injected — one would
 * double-submit alongside the real control. This mirrors the OTP-input design
 * and diverges from `ForNumberInput`, whose displayed (formatted)
 * text differs from its submitted value.
 *
 * Implemented as an `@Directive()`-decorated abstract class so Angular detects
 * the inherited `value` model — the same mechanism `FormUiControlBase` relies
 * on. Internal core tier — no semver guarantee.
 */
@Directive()
export abstract class TextValueControlBase
  extends FormUiControlBase
  implements FormValueControl<string>
{
  /**
   * Two-way bindable text value. Required by `FormValueControl<string>`.
   * Defaults to `''` — a text field is naturally empty, not absent, which
   * keeps the type non-nullable. Reflected as `data-empty` while `''`.
   */
  readonly value = model<string>('');

  readonly #host = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef);

  #composing = false;

  constructor() {
    super();

    // Reflect the native `disabled` attribute non-destructively so a
    // consumer-set `disabled` on the same element survives an enabled state.
    reflectDisabled(this.effectiveDisabled);

    mirrorValue(
      () => this.#host.nativeElement,
      this.value,
      () => this.#composing,
    );
  }

  /** Bridges the native `input` event into the `value` model. */
  protected onInput(event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    // Suppress the intermediate text an IME emits between `compositionstart`
    // and `compositionend`; the final composed string is flushed once on
    // `compositionend`. Mirrors the OTP / Combobox guard so all three text
    // controls behave identically.
    if (this.#composing) {
      return;
    }
    this.value.set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  /** Starts an IME composition; suppresses intermediate `input` propagation. */
  protected onCompositionStart(): void {
    this.#composing = true;
  }

  /** Ends an IME composition and flushes the final composed value once. */
  protected onCompositionEnd(): void {
    this.#composing = false;
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.value.set(this.#host.nativeElement.value);
  }

  /**
   * Marks the control touched and re-syncs the native element to `value()`,
   * discarding any text written to the element without an `input` event.
   */
  protected onBlur(): void {
    this.markTouched();
    const el = this.#host.nativeElement;
    if (el.value !== this.value()) {
      el.value = this.value();
    }
  }
}
