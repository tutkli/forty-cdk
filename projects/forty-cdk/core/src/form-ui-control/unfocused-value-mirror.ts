import { DOCUMENT, effect, inject } from '@angular/core';

type ValueElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Mirrors an external value string onto a native `<input>` / `<textarea>`'s
 * `.value`, but only while the element is **not** focused — assigning `.value`
 * mid-edit would jump the caret. Live typing flows in through the element's own
 * `input` listener, so this never fights the user's editing; it reconciles the
 * displayed text only for writes that originate outside the element (a consumer
 * `[(value)]` / `[formField]` push, or a post-commit reformat).
 *
 * The three text-valued controls all need this exact guard but obtain their
 * target element differently: `ForInput` / `ForTextarea` and `ForNumberInput`
 * own a host element present from construction, whereas `ForOtpInput` injects
 * its real `<input>` lazily after hydration. The `el` accessor therefore returns
 * `HTMLInputElement | HTMLTextAreaElement | null`; a `null` target is skipped and
 * the effect re-runs once the element appears (it is read reactively).
 *
 * Writing the DOM is a genuine side effect, not signal propagation, so this is a
 * sanctioned `effect()` use. Must be called from an injection context (it injects
 * `DOCUMENT` and creates an `effect`), typically a directive constructor.
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
    if (document.activeElement !== element && element.value !== next) {
      element.value = next;
    }
  });
}
