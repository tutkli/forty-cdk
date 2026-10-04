import { DOCUMENT, effect, inject } from '@angular/core';

import { resolveActiveElement } from '../composed-tree/composed-tree';

type ValueElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Mirrors an external value string onto a native `<input>` / `<textarea>`'s
 * `.value`, but only while the element is **not** focused. It is for controls
 * whose displayed text differs from the text being typed — `ForNumberInput`'s
 * formatted display, `ForOtpInput`'s clamped value — where a write mid-edit
 * would replace what the user typed; such a control reconciles its display
 * itself once the edit commits. Focus is resolved through open shadow roots,
 * so an element focused inside a shadow tree counts as focused.
 *
 * The `el` accessor returns `null` until the element exists (`ForOtpInput`
 * injects its real `<input>` after hydration); a `null` target is skipped and
 * the effect re-runs once the element appears, since it is read reactively.
 *
 * Writing the DOM is a genuine side effect, not signal propagation, so this is a
 * sanctioned `effect()` use. Must be called from an injection context.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 *
 * @param el Accessor for the target element, or `null` until it exists.
 * @param value Accessor for the desired displayed text.
 */
export function mirrorUnfocusedValue(el: () => ValueElement | null, value: () => string): void {
  const document = inject(DOCUMENT);
  effect(() => {
    const element = el();
    if (!element) {
      return;
    }
    const next = value();
    if (element.value !== next && resolveActiveElement(document) !== element) {
      element.value = next;
    }
  });
}

/**
 * Mirrors a value string onto a native `<input>` / `<textarea>`'s `.value`
 * whenever the two differ, focused or not, except while an IME composition is
 * in progress. It is for controls whose model is the typed text itself
 * (`ForInput`, `ForTextarea`): typing already lands in the model, so the only
 * writes this ever makes come from elsewhere — a consumer clearing the field on
 * submit, a `[formField]` reset, a reformat in `(valueChange)` — and each one
 * must reach the element before the next keystroke reads the old text back.
 *
 * Must be called from an injection context. Internal to `forty-cdk/core`.
 *
 * @param el Accessor for the target element.
 * @param value Accessor for the desired displayed text.
 * @param composing Whether an IME composition is in progress on the element.
 */
export function mirrorValue(
  el: () => ValueElement,
  value: () => string,
  composing: () => boolean,
): void {
  effect(() => {
    const element = el();
    const next = value();
    if (element.value !== next && !composing()) {
      element.value = next;
    }
  });
}
