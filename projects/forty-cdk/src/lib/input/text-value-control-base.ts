import { DOCUMENT, Directive, effect, ElementRef, inject, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';

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
  readonly #document = inject(DOCUMENT);

  constructor() {
    super();

    // Mirror external writes (consumer `[(value)]` or `[formField]`) back to
    // the native element — but only while it isn't focused, since assigning
    // `.value` mid-edit would jump the caret. The user's own typing already
    // flows in through the `(input)` listener, so this never fights live
    // editing. Writing the DOM is a side effect, not signal propagation.
    effect(() => {
      const next = this.value();
      const el = this.#host.nativeElement;
      if (this.#document.activeElement !== el && el.value !== next) {
        el.value = next;
      }
    });
  }

  /** Bridges the native `input` event into the `value` model. */
  protected onInput(event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.value.set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }
}
