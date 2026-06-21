import { Directive, ElementRef, inject, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { mirrorUnfocusedValue } from '../_internal/form-ui-control/unfocused-value-mirror';

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
 * and deliberately diverges from `ForNumberInput`, whose displayed (formatted)
 * text differs from its submitted value.
 *
 * Implemented as an `@Directive()`-decorated abstract class so Angular detects
 * the inherited `value` model — the same mechanism `FormUiControlBase` relies
 * on. Internal — not re-exported from `public-api.ts`.
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

    // Mirror external writes (consumer `[(value)]` or `[formField]`) back to
    // the native element while it isn't focused. The user's own typing already
    // flows in through the `(input)` listener, so this never fights live editing.
    mirrorUnfocusedValue(() => this.#host.nativeElement, this.value);
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
   * Marks the control touched and re-syncs the native element to `value()`.
   * The mirror effect skips writes while focused (to protect the caret), so an
   * external write made during editing leaves stale text; blur is the moment to
   * reconcile the visible text with the model.
   */
  protected onBlur(): void {
    this.markTouched();
    const el = this.#host.nativeElement;
    if (el.value !== this.value()) {
      el.value = this.value();
    }
  }
}
